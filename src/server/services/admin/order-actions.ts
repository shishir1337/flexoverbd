"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  RESTOCKING_STATUSES,
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

/**
 * Order mutations.
 *
 * Every one re-checks the caller's permission. A Server Action is a public HTTP
 * endpoint — the fact that the UI only rendered the button for a manager means
 * nothing to someone posting to it directly.
 */

const updateStatusSchema = z.object({
  number: z.string().min(1),
  status: z.enum([
    "PLACED",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
  ]),
  note: z.string().trim().max(500).optional(),
  /**
   * Captured when marking an order shipped. Optional on every other
   * transition, so the bulk path and the plain buttons are unaffected.
   */
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Timestamps that mark when an order reached a milestone. */
const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "confirmedAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
};

export async function updateOrderStatus(
  input: z.input<typeof updateStatusSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ order: ["update-status"] });

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { number, status, note, courier, trackingNumber } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (order.status === status) {
    return { ok: false, error: `Order is already ${status.toLowerCase()}.` };
  }

  // Guarded rather than free-form: without this an order could jump from
  // Placed straight to Delivered, or come back from Cancelled with its stock
  // already returned — double-counting inventory.
  if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
    return {
      ok: false,
      error: `Cannot move an order from ${order.status.toLowerCase()} to ${status.toLowerCase()}.`,
    };
  }

  const timestampField = STATUS_TIMESTAMP[status];
  const restocks =
    RESTOCKING_STATUSES.includes(status) &&
    !RESTOCKING_STATUSES.includes(order.status);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status,
          ...(timestampField ? { [timestampField]: new Date() } : {}),
          // Only written when supplied, so re-marking an order shipped from
          // the bulk bar does not wipe a tracking number someone already
          // entered by hand.
          ...(courier ? { courier } : {}),
          ...(trackingNumber ? { trackingNumber } : {}),
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status,
          note: note || null,
          isCustomerVisible: status !== "CANCELLED" || Boolean(note),
          createdById: session.user.id,
        },
      });

      // Cancelling or accepting a return puts the units back, through the
      // ledger so the running total stays explainable.
      if (restocks) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.qty } },
          });
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              delta: item.qty,
              reason: status === "CANCELLED" ? "CANCEL" : "RETURN",
              orderId: order.id,
              createdById: session.user.id,
            },
          });
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { soldCount: { decrement: item.qty } },
            });
          }
        }
      }
    });
  } catch (e) {
    console.error("updateOrderStatus failed", e);
    return { ok: false, error: "Could not update the order. Please retry." };
  }

  await recordAudit({
    userId: session.user.id,
    action: "order.update-status",
    entity: "Order",
    entityId: order.id,
    before: { status: order.status },
    after: { status, restocked: restocks },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${number}`);
  return { ok: true };
}

const noteSchema = z.object({
  number: z.string().min(1),
  note: z.string().trim().min(1, "Write a note first.").max(500),
  isCustomerVisible: z.boolean().default(false),
});

/** Internal notes default to hidden — staff write things customers should not read. */
export async function addOrderNote(
  input: z.input<typeof noteSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ order: ["update-status"] });

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { number, note, isCustomerVisible } = parsed.data;

  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      status: order.status,
      note,
      isCustomerVisible,
      createdById: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "order.note",
    entity: "Order",
    entityId: order.id,
    after: { note, isCustomerVisible },
  });

  revalidatePath(`/admin/orders/${number}`);
  return { ok: true };
}

const bulkSchema = z.object({
  numbers: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(ORDER_STATUSES),
});

export type BulkResult = {
  ok: true;
  moved: number;
  skipped: { number: string; reason: string }[];
};

/**
 * Advance several orders at once.
 *
 * The daily rhythm of a COD store is batched — ring twenty customers, then mark
 * all the ones who answered as confirmed; hand a stack to the courier, then
 * mark them all shipped. Doing that one order at a time is twenty page loads.
 *
 * Each order still goes through `updateOrderStatus`, so every transition guard,
 * stock restock and audit entry applies exactly as it would individually. The
 * ones that cannot move are *reported*, not silently dropped — a bulk action
 * that quietly skips half its input is worse than one that fails.
 */
export async function bulkUpdateOrderStatus(
  input: z.input<typeof bulkSchema>,
): Promise<BulkResult | { ok: false; error: string }> {
  await requirePermission({ order: ["update-status"] });

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { numbers, status } = parsed.data;

  let moved = 0;
  const skipped: { number: string; reason: string }[] = [];

  // Sequential on purpose. These share rows — the same variant can appear in
  // several orders — and running the restock transactions concurrently is how
  // you get deadlocks on a busy day.
  for (const number of numbers) {
    const result = await updateOrderStatus({ number, status });
    if (result.ok) {
      moved += 1;
    } else {
      skipped.push({ number, reason: result.error });
    }
  }

  revalidatePath("/admin/orders");
  return { ok: true, moved, skipped };
}

const shippingSchema = z.object({
  number: z.string().min(1),
  courier: z.string().trim().max(60),
  trackingNumber: z.string().trim().max(60),
});

/**
 * Edit the courier and tracking number after the fact.
 *
 * Separate from the status change because these get corrected far more often
 * than they get set: a courier is swapped, a tracking number is mistyped off a
 * paper manifest. Making that a status transition would write a bogus event
 * into the order's history every time someone fixed a digit.
 */
export async function setOrderShipping(
  input: z.input<typeof shippingSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ order: ["update-status"] });

  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { number, courier, trackingNumber } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { number },
    select: { id: true, courier: true, trackingNumber: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      courier: courier || null,
      trackingNumber: trackingNumber || null,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "order.shipping.update",
    entity: "Order",
    entityId: order.id,
    before: { courier: order.courier, trackingNumber: order.trackingNumber },
    after: { courier, trackingNumber },
  });

  revalidatePath(`/admin/orders/${number}`);
  return { ok: true };
}
