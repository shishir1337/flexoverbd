"use server";

import { z } from "zod";
import { checkCoupon } from "@/server/services/coupons";

/**
 * Coupon preview for the checkout form.
 *
 * Returns what the code is *worth*, not permission to use it. `placeOrder`
 * re-runs the same check against its own recomputed subtotal and delivery fee
 * and will refuse the order if anything has changed — so a stale or forged
 * preview costs nothing.
 */

const previewSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().min(0),
  deliveryFee: z.number().int().min(0),
  phone: z.string().trim().max(20).optional(),
});

export type CouponPreview =
  | {
      ok: true;
      code: string;
      discount: number;
      freeDelivery: boolean;
      description: string;
    }
  | { ok: false; message: string };

export async function previewCoupon(
  input: z.input<typeof previewSchema>,
): Promise<CouponPreview> {
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Enter a code." };

  const result = await checkCoupon(parsed.data);
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    code: result.code,
    discount: result.discount,
    freeDelivery: result.freeDelivery,
    description: result.description,
  };
}
