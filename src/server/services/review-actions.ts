"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

/**
 * Leaving a review.
 *
 * Two rules, both enforced here rather than in the form:
 *
 *  1. **You must have bought it and received it.** Checked against a delivered
 *     order containing this product, matched on the mobile number — which is
 *     how orders are linked to people on a guest-first, cash-on-delivery store.
 *     That check is also what sets `isVerified`, so the badge means something.
 *  2. **Nothing appears until it is approved.** Reviews land unapproved and a
 *     human publishes them in the admin.
 */

export type ReviewResult = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  productId: z.string().min(1),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? v)
    .refine((v) => isValidPhone(v), PHONE_ERROR),
  rating: z.coerce.number().int().min(1).max(5),
  body: z
    .string()
    .trim()
    .min(20, "Tell people a little more — at least 20 characters.")
    .max(1500),
  location: z.string().trim().max(80).optional(),
});

export type ReviewInput = z.input<typeof reviewSchema>;

export async function submitReview(input: ReviewInput): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  // The order is the proof of purchase. No delivered order with this product
  // against this number means no review — otherwise the "verified" badge is
  // decoration and the ratings are worth nothing.
  const order = await prisma.order.findFirst({
    where: {
      customerPhone: d.phone,
      status: "DELIVERED",
      items: { some: { productId: d.productId } },
    },
    select: { id: true, customerName: true },
  });

  if (!order) {
    return {
      ok: false,
      error:
        "We could not find a delivered order for this product against that number.",
    };
  }

  const existing = await prisma.review.findFirst({
    where: { productId: d.productId, orderId: order.id },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You have already reviewed this product." };
  }

  try {
    await prisma.review.create({
      data: {
        productId: d.productId,
        orderId: order.id,
        authorName: order.customerName,
        location: d.location || null,
        rating: d.rating,
        body: d.body,
        // Verified because the order was checked above; unapproved because a
        // person has not read it yet.
        isVerified: true,
        isApproved: false,
      },
    });

    // Nothing to revalidate on the storefront — it is not visible yet. The
    // admin list is uncached, so it picks this up on its next load.
    return { ok: true };
  } catch (e) {
    console.error("submitReview failed", e);
    return { ok: false, error: "Could not save your review. Please retry." };
  }
}

/* --------------------------------------------------------------- Admin */

/**
 * Recompute a product's stored rating from its approved reviews.
 *
 * `ratingAvg` and `reviewCount` are denormalised onto Product because listings
 * sort and filter on them, and joining every card to an aggregate would be
 * absurd. They are recomputed on every moderation decision so the number on a
 * card cannot drift from the reviews behind it.
 */
async function syncProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      reviewCount: agg._count._all,
    },
  });
}

export async function setReviewApproved(
  id: string,
  approved: boolean,
): Promise<ReviewResult> {
  const session = await requirePermission({ content: ["publish"] });

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved: approved },
    select: { productId: true, product: { select: { slug: true } } },
  });

  if (review.productId) {
    await syncProductRating(review.productId);
    revalidateTag(tags.productReviews(review.productId), "max");
  }
  revalidateTag(tags.reviews, "max");
  revalidateTag(tags.products, "max");
  if (review.product?.slug) {
    revalidateTag(tags.product(review.product.slug), "max");
  }

  await recordAudit({
    userId: session.user.id,
    action: approved ? "review.approve" : "review.unapprove",
    entity: "Review",
    entityId: id,
    after: { isApproved: approved },
  });

  return { ok: true };
}

export async function deleteReview(id: string): Promise<ReviewResult> {
  const session = await requirePermission({ content: ["delete"] });

  const review = await prisma.review.delete({
    where: { id },
    select: { productId: true, product: { select: { slug: true } } },
  });

  if (review.productId) {
    await syncProductRating(review.productId);
    revalidateTag(tags.productReviews(review.productId), "max");
  }
  revalidateTag(tags.reviews, "max");
  revalidateTag(tags.products, "max");
  if (review.product?.slug) {
    revalidateTag(tags.product(review.product.slug), "max");
  }

  await recordAudit({
    userId: session.user.id,
    action: "review.delete",
    entity: "Review",
    entityId: id,
  });

  return { ok: true };
}
