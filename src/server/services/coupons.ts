import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Coupon validation.
 *
 * One function, called from two places: the checkout form's preview and
 * `placeOrder` itself. That is deliberate — a coupon check that lives only in
 * the form is a discount anyone can grant themselves by posting a crafted
 * request, and a check that lives only in the action quotes one number to the
 * shopper and charges another.
 *
 * Every rule is evaluated against database rows, never against anything the
 * browser sent apart from the code itself.
 */

export type CouponFailure =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USAGE_LIMIT"
  | "PER_USER_LIMIT"
  | "MIN_SUBTOTAL";

export type CouponCheck =
  | {
      ok: true;
      couponId: string;
      code: string;
      /** Taken off the subtotal. */
      discount: number;
      /** True for FREE_DELIVERY, which waives the fee instead. */
      freeDelivery: boolean;
      description: string;
      /** Passed through so the write can re-assert it atomically. */
      usageLimit: number | null;
    }
  | { ok: false; reason: CouponFailure; message: string };

const MESSAGES: Record<CouponFailure, string> = {
  NOT_FOUND: "That code is not valid.",
  INACTIVE: "That code is no longer active.",
  NOT_STARTED: "That code is not active yet.",
  EXPIRED: "That code has expired.",
  USAGE_LIMIT: "That code has been fully redeemed.",
  PER_USER_LIMIT: "You have already used that code.",
  MIN_SUBTOTAL: "", // Filled in below with the actual amount.
};

function fail(reason: CouponFailure, message?: string): CouponCheck {
  return { ok: false, reason, message: message ?? MESSAGES[reason] };
}

export async function checkCoupon({
  code,
  subtotal,
  deliveryFee,
  phone,
}: {
  code: string;
  subtotal: number;
  deliveryFee: number;
  /** Used for the per-customer limit. Guests have no account, so the mobile
   *  number is the only identity a repeat redemption can be tied to. */
  phone?: string;
}): Promise<CouponCheck> {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return fail("NOT_FOUND");

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalised },
  });
  if (!coupon) return fail("NOT_FOUND");
  if (!coupon.isActive) return fail("INACTIVE");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return fail("NOT_STARTED");
  if (coupon.endsAt && coupon.endsAt < now) return fail("EXPIRED");

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return fail("USAGE_LIMIT");
  }

  if (coupon.minSubtotal !== null && subtotal < coupon.minSubtotal) {
    return fail(
      "MIN_SUBTOTAL",
      `Spend ৳${coupon.minSubtotal.toLocaleString("en-BD")} to use this code.`,
    );
  }

  if (coupon.perUserLimit !== null && phone) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, phone },
    });
    if (used >= coupon.perUserLimit) return fail("PER_USER_LIMIT");
  }

  if (coupon.type === "FREE_DELIVERY") {
    return {
      ok: true,
      couponId: coupon.id,
      code: coupon.code,
      // Recorded as a discount of the fee so the order's arithmetic still
      // adds up, and so a free-delivery code on an already-free order is
      // correctly worth nothing rather than negative.
      discount: 0,
      freeDelivery: true,
      usageLimit: coupon.usageLimit,
      description:
        deliveryFee > 0 ? "Free delivery" : "Free delivery (already free)",
    };
  }

  const raw =
    coupon.type === "PERCENT"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;

  // Capped at the subtotal as well as at maxDiscount: a ৳500 fixed code on a
  // ৳300 basket must not produce a negative total.
  const capped = Math.min(
    raw,
    coupon.maxDiscount ?? Number.POSITIVE_INFINITY,
    subtotal,
  );

  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    discount: capped,
    freeDelivery: false,
    usageLimit: coupon.usageLimit,
    description:
      coupon.type === "PERCENT"
        ? `${coupon.value}% off`
        : `৳${coupon.value.toLocaleString("en-BD")} off`,
  };
}
