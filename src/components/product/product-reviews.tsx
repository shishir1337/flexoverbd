import { BadgeCheck, MessageSquare, Star } from "lucide-react";
import { StarRow } from "@/components/ui/primitives";
import { cn, compactCount } from "@/lib/utils";
import type { ReviewSummary } from "@/server/services/reviews";

/**
 * Ratings and reviews for one product.
 *
 * Everything here comes from approved rows in the `Review` table. A product
 * with none says so — the previous version invented four named reviewers per
 * product and a star breakdown to match, which also fed Google's
 * `aggregateRating`. An honest empty state is the correct trade.
 */

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Relative age, computed from a timestamp the server captured.
 *
 * `now` is passed in rather than read here because this renders on the server:
 * a bare `Date.now()` would be a different value on every render and could not
 * go in a static shell. See `getApproximateNow`.
 */
function age(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function ProductReviews({
  productId,
  summary,
  now,
}: {
  productId: string;
  summary: ReviewSummary;
  /** Epoch ms, captured server-side. */
  now: number;
}) {
  return (
    <section
      aria-labelledby="reviews-heading"
      className="scroll-mt-24"
      id="reviews"
    >
      <h2
        id="reviews-heading"
        className="mb-4 font-extrabold text-ink text-lg sm:text-xl"
      >
        Ratings &amp; reviews
      </h2>

      {summary.total === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-line border-dashed bg-surface px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-surface-2">
            <MessageSquare aria-hidden className="size-5 text-ink-4" />
          </span>
          <p className="mt-3 font-bold text-ink text-sm">No reviews yet</p>
          <p className="mt-1 max-w-sm text-ink-3 text-sm">
            Reviews appear here once a customer who has had this delivered
            writes one.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 rounded-card border border-line bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-4xl text-ink leading-none tnum">
                {summary.average.toFixed(1)}
              </span>
              <div>
                <StarRow value={summary.average} />
                <p className="mt-1 text-2xs text-ink-3">
                  {compactCount(summary.total)}{" "}
                  {summary.total === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5">
              {summary.breakdown.map((row) => (
                <li key={row.stars} className="flex items-center gap-2">
                  <span className="flex w-8 shrink-0 items-center gap-0.5 text-2xs text-ink-2 tnum">
                    {row.stars}
                    <Star aria-hidden className="size-3 fill-gold text-gold" />
                  </span>
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"
                    role="progressbar"
                    aria-valuenow={row.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.stars} star: ${row.percent}%`}
                  >
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-2xs text-ink-3 tnum">
                    {row.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul
            className={cn(
              "divide-y divide-line border-line border-t pt-1",
              "lg:border-t-0 lg:pt-0",
            )}
          >
            {summary.reviews.map((review) => (
              <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-2xs text-brand-on"
                  >
                    {initials(review.authorName)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-bold text-ink text-sm">
                      <span className="clamp-1">{review.authorName}</span>
                      {review.isVerified && (
                        <BadgeCheck
                          aria-label="Verified purchase"
                          className="size-4 shrink-0 text-success"
                        />
                      )}
                    </p>
                    <p className="text-2xs text-ink-3">
                      {[review.location, age(review.createdAt, now)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <StarRow value={review.rating} className="mt-2.5" />
                <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed sm:text-sm">
                  {review.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anchor kept for the "N reviews" link in the buy box. */}
      <span hidden data-product-id={productId} />
    </section>
  );
}
