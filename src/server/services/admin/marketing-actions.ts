"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Blank means "no limit", which is NULL in the column, not zero. */
const optionalInt = z
  .string()
  .trim()
  .default("")
  .transform((v) => (v === "" ? null : Number(v)))
  .refine(
    (n) => n === null || (Number.isInteger(n) && n >= 0),
    "Enter a whole number, or leave it blank.",
  );

const optionalDate = z
  .string()
  .trim()
  .default("")
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date.");

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "At least 3 characters.")
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and hyphens only.")
    .transform((v) => v.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED", "FREE_DELIVERY"]),
  value: z.coerce.number().int().min(0),
  minSubtotal: optionalInt,
  maxDiscount: optionalInt,
  usageLimit: optionalInt,
  perUserLimit: optionalInt,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean().default(true),
});

export type CouponInput = z.input<typeof couponSchema>;

/**
 * Coupon mutations.
 *
 * The validation here is about stopping a code that cannot behave sensibly from
 * existing at all — a 150% discount, or a window that ends before it starts.
 * What a code is *worth* on a given basket is decided by `checkCoupon` at
 * checkout, against the database, never here.
 */
export async function saveCoupon(
  id: string | null,
  values: CouponInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ marketing: ["update"] });

  const parsed = couponSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.type === "PERCENT" && (d.value < 1 || d.value > 100)) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { value: "A percentage has to be between 1 and 100." },
    };
  }
  if (d.type === "FIXED" && d.value < 1) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { value: "Enter the amount to take off." },
    };
  }
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { endsAt: "The end date is before the start date." },
    };
  }

  const clash = await prisma.coupon.findFirst({
    where: { code: d.code, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { code: "That code already exists." },
    };
  }

  try {
    const saved = id
      ? await prisma.coupon.update({ where: { id }, data: d })
      : await prisma.coupon.create({ data: d });

    await recordAudit({
      userId: session.user.id,
      action: id ? "marketing.coupon.update" : "marketing.coupon.create",
      entity: "Coupon",
      entityId: saved.id,
      after: { code: saved.code, type: saved.type, value: saved.value },
    });

    revalidatePath("/admin/marketing");
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    console.error("saveCoupon failed", e);
    return { ok: false, error: "Could not save the coupon." };
  }
}

/**
 * Deactivate rather than delete once a code has been redeemed: the redemption
 * rows and the orders that used it both point here, and losing the code means
 * losing the ability to explain a discount on a past order.
 */
export async function deleteCoupon(id: string): Promise<ActionResult> {
  const session = await requirePermission({ marketing: ["delete"] });

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true, orders: true } } },
  });
  if (!coupon) return { ok: false, error: "Coupon not found." };

  // Redemptions and orders are two views of the same event — an order both
  // points at the coupon and gets a redemption row — so adding them reported
  // every use twice. The redemption ledger is the count that means something;
  // orders only matter for deciding whether anything references this at all.
  const used = coupon._count.redemptions;
  const referenced = used > 0 || coupon._count.orders > 0;
  if (referenced) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await recordAudit({
      userId: session.user.id,
      action: "marketing.coupon.deactivate",
      entity: "Coupon",
      entityId: id,
      after: { isActive: false },
    });
    revalidatePath("/admin/marketing");
    return {
      ok: false,
      error: `${coupon.code} has been used ${used} ${
        used === 1 ? "time" : "times"
      }, so it was switched off rather than deleted.`,
    };
  }

  await prisma.coupon.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "marketing.coupon.delete",
    entity: "Coupon",
    entityId: id,
    before: { code: coupon.code },
  });

  revalidatePath("/admin/marketing");
  return { ok: true };
}

/* ---------------------------------------------------------- Flash sales */

const flashSchema = z.object({
  name: z.string().trim().min(2, "Give the campaign a name."),
  startsAt: z.string().trim().min(1, "Choose a start."),
  endsAt: z.string().trim().min(1, "Choose an end."),
  isActive: z.boolean().default(true),
});

export type FlashSaleInput = z.input<typeof flashSchema>;

export async function saveFlashSale(
  id: string | null,
  values: FlashSaleInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ marketing: ["update"] });

  const parsed = flashSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Please check the dates." };
  }
  if (endsAt <= startsAt) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { endsAt: "A sale has to end after it starts." },
    };
  }

  const data = {
    name: parsed.data.name,
    isActive: parsed.data.isActive,
    startsAt,
    endsAt,
  };

  const saved = id
    ? await prisma.flashSaleCampaign.update({ where: { id }, data })
    : await prisma.flashSaleCampaign.create({ data });

  await recordAudit({
    userId: session.user.id,
    action: id ? "marketing.flash.update" : "marketing.flash.create",
    entity: "FlashSaleCampaign",
    entityId: saved.id,
    after: { name: saved.name },
  });

  // The flash rail and every product's effective price depend on this.
  revalidateTag(tags.flashSale, "max");
  revalidateTag(tags.products, "max");
  revalidatePath("/admin/marketing");
  return { ok: true, data: { id: saved.id } };
}

export async function deleteFlashSale(id: string): Promise<ActionResult> {
  const session = await requirePermission({ marketing: ["delete"] });

  const campaign = await prisma.flashSaleCampaign.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!campaign) return { ok: false, error: "Campaign not found." };

  // Items cascade with the campaign; the products themselves are untouched.
  await prisma.flashSaleCampaign.delete({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "marketing.flash.delete",
    entity: "FlashSaleCampaign",
    entityId: id,
    before: { name: campaign.name },
  });

  revalidateTag(tags.flashSale, "max");
  revalidateTag(tags.products, "max");
  revalidatePath("/admin/marketing");
  return { ok: true };
}

/* --------------------------------------------------------- Subscribers */

/**
 * The full subscribed list, for the CSV export.
 *
 * An action rather than data rendered into the page: the addresses are personal
 * data, and there is no reason for every one of them to sit in the HTML of a
 * screen that is only ever opened to check a count.
 */
export async function exportSubscribers(): Promise<string[]> {
  const session = await requirePermission({ marketing: ["read"] });

  const rows = await prisma.newsletterSubscriber.findMany({
    where: { isSubscribed: true },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "marketing.subscribers.export",
    entity: "NewsletterSubscriber",
    entityId: "*",
    after: { count: rows.length },
  });

  return rows.map((r) => r.email);
}
