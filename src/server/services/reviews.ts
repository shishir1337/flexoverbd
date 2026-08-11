import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";

/**
 * Product reviews, from the database.
 *
 * Everything here is real or absent. The previous version generated four
 * plausible reviews per product, attributed them to invented named people in
 * named Bangladeshi towns, and marked them "verified purchase" — beside a star
 * breakdown synthesised from a seeded average. None of it was true, and it was
 * feeding Google's `aggregateRating` as well as the page.
 *
 * A product with no approved reviews now shows that it has none. That is a
 * worse-looking page and a correct one.
 */

export type ProductReview = {
  id: string;
  authorName: string;
  location: string | null;
  rating: number;
  body: string;
  /** Backed by an actual delivered order, not a claim in the copy. */
  isVerified: boolean;
  createdAt: string;
};

export type ReviewSummary = {
  average: number;
  total: number;
  /** Real counts per star band — empty when there is nothing to count. */
  breakdown: { stars: number; count: number; percent: number }[];
  reviews: ProductReview[];
};

const EMPTY: ReviewSummary = {
  average: 0,
  total: 0,
  breakdown: [],
  reviews: [],
};

export async function getProductReviewSummary(
  productId: string,
): Promise<ReviewSummary> {
  "use cache";
  cacheTag(tags.productReviews(productId), tags.reviews);
  cacheLife("hours");

  const rows = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      authorName: true,
      location: true,
      rating: true,
      body: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (rows.length === 0) return EMPTY;

  const total = rows.length;
  const sum = rows.reduce((n, r) => n + r.rating, 0);

  const breakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = rows.filter((r) => r.rating === stars).length;
    return { stars, count, percent: Math.round((count / total) * 100) };
  });

  return {
    average: Math.round((sum / total) * 10) / 10,
    total,
    breakdown,
    reviews: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      location: r.location,
      rating: r.rating,
      body: r.body,
      isVerified: r.isVerified,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
