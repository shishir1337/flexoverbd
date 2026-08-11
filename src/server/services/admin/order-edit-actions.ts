"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

/**
 * Editing an order after it has been placed.
 *
 * Cash-on-delivery customers ring up to fix an address or a digit in their
 * number constantly, and to add or drop an item while they are on the phone.
 * Until this existed the only way to act on any of that was to cancel and
 * re-place — throwing away the order number the customer is holding, its
 * history, and its stock reservation.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Only while it is still in our hands. Once it is with a courier the parcel is
 * physically sealed and out of the building; editing it then would make the
 * packing slip taped to it a lie.
 */
const EDITABLE_STATUSES: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED"];

const addressSchema = z.object({
  number: z.string().min(1),
  customerName: z.string().trim().min(2, "Enter a name."),
  customerPhone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? v)
    .refine((v) => isValidPhone(v), PHONE_ERROR),
  districtId: z.string().min(1, "Choose a district."),
  area: z.string().trim().min(2, "Enter the area or thana."),
  line1: z.string().trim().min(4, "Enter the house and road."),
  landmark: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Correct the delivery details.
 *
 * Changing the district re-prices delivery from that district's zone, because
 * the fee is a function of where the parcel is going — and it is re-derived
 * from the database, never taken from the form, exactly as at checkout. The
 * subtotal is untouched: the items have not changed, and their snapshots are
 * what the customer agreed to pay.
 *
 * An order that was already shipping free stays free. Someone waived that fee
 * on purpose, and a corrected house number is not a reason to revisit it.
 */
export async function updateOrderAddress(
  input: z.input<typeof addressSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ order: ["update-status"] });

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  const order = await prisma.order.findUnique({
    where: { number: d.number },
    include: { district: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (!EDITABLE_STATUSES.includes(order.status)) {
    return {
      ok: false,
      error: `A ${order.status.toLowerCase()} order cannot be edited. Cancel it and place a new one.`,
    };
  }

  const district = await prisma.district.findUnique({
    where: { id: d.districtId },
    include: { zone: true },
  });
  if (!district) return { ok: false, error: "Unknown district." };

  const baseFee = district.feeOverride ?? district.zone.fee;
  const deliveryFee = order.deliveryFee === 0 ? 0 : baseFee;
  const total = order.subtotal + deliveryFee - order.discount;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          districtId: d.districtId,
          area: d.area,
          line1: d.line1,
          landmark: d.landmark || null,
          notes: d.notes || null,
          deliveryFee,
          total,
        },
      });

      // Into the order's own history, not only the audit log: whoever packs
      // this needs to see that the address moved after it was placed.
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `Delivery details updated${
            district.id !== order.districtId
              ? ` — district changed to ${district.name}`
              : ""
          }.`,
          isCustomerVisible: false,
          createdById: session.user.id,
        },
      });
    });

    await recordAudit({
      userId: session.user.id,
      action: "order.address.update",
      entity: "Order",
      entityId: order.id,
      before: {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        district: order.district.name,
        area: order.area,
        line1: order.line1,
        total: order.total,
      },
      after: {
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        district: district.name,
        area: d.area,
        line1: d.line1,
        total,
      },
    });

    revalidatePath(`/admin/orders/${d.number}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    console.error("updateOrderAddress failed", e);
    return { ok: false, error: "Could not save the changes. Please retry." };
  }
}

const itemSchema = z.object({
  number: z.string().min(1),
  itemId: z.string().min(1),
  /** Zero removes the line. */
  qty: z.coerce.number().int().min(0).max(50),
});

/**
 * Change how many of one line, or remove it.
 *
 * Stock moves with the change and through the ledger, so the running total
 * stays explainable: increasing takes more units out and is refused if they
 * are not there, decreasing or removing puts them back.
 *
 * The unit price is deliberately *not* re-read from the product.
 * `priceSnapshot` is what the customer agreed to, and a price rise since they
 * ordered is not theirs to absorb because they asked for one more.
 */
export async function updateOrderItemQty(
  input: z.input<typeof itemSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ order: ["update-status"] });

  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid quantity." };
  const { number, itemId, qty } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (!EDITABLE_STATUSES.includes(order.status)) {
    return {
      ok: false,
      error: `A ${order.status.toLowerCase()} order cannot be edited.`,
    };
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    return { ok: false, error: "That line is no longer on the order." };
  }

  if (order.items.length === 1 && qty === 0) {
    return {
      ok: false,
      error: "An order needs at least one item. Cancel the order instead.",
    };
  }

  const delta = qty - item.qty;
  if (delta === 0) return { ok: true };

  try {
    await prisma.$transaction(async (tx) => {
      if (item.variantId) {
        if (delta > 0) {
          // Conditional, exactly as at checkout: taking more units has to fail
          // rather than drive stock negative.
          const { count } = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: delta } },
            data: { stock: { decrement: delta } },
          });
          if (count === 0) throw new Error("OUT_OF_STOCK");
        } else {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: -delta } },
          });
        }

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            delta: -delta,
            reason: "CORRECTION",
            orderId: order.id,
            note: `Order ${order.number}: quantity ${item.qty} to ${qty}`,
            createdById: session.user.id,
          },
        });
      }

      if (qty === 0) {
        await tx.orderItem.delete({ where: { id: itemId } });
      } else {
        await tx.orderItem.update({
          where: { id: itemId },
          data: { qty, lineTotal: item.priceSnapshot * qty },
        });
      }

      // Recomputed from what is actually left rather than adjusted by a delta.
      // A running total that drifts is worse than one that is slow.
      const remaining = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { lineTotal: true },
      });
      const subtotal = remaining.reduce((n, r) => n + r.lineTotal, 0);

      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal,
          total: subtotal + order.deliveryFee - order.discount,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          note:
            qty === 0
              ? `Removed ${item.titleSnapshot} from the order.`
              : `${item.titleSnapshot}: quantity ${item.qty} to ${qty}.`,
          isCustomerVisible: false,
          createdById: session.user.id,
        },
      });
    });

    await recordAudit({
      userId: session.user.id,
      action: qty === 0 ? "order.item.remove" : "order.item.qty",
      entity: "Order",
      entityId: order.id,
      before: { item: item.titleSnapshot, qty: item.qty },
      after: { qty },
    });

    revalidatePath(`/admin/orders/${number}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") {
      return {
        ok: false,
        error: `Not enough ${item.titleSnapshot} in stock for that quantity.`,
      };
    }
    console.error("updateOrderItemQty failed", e);
    return { ok: false, error: "Could not change the quantity." };
  }
}
