import { BadgeCheck, MessageCircle, Star } from "lucide-react";
import Image from "next/image";
import { cn, compactCount } from "@/lib/utils";
import { getReviewScreenshots } from "@/server/services/content";
import { getStoreStats } from "@/server/services/settings";

/**
 * Social proof as screenshots rather than typed quotes.
 *
 * In Bangladesh the trust signal that actually converts is a screenshot of the
 * real Messenger conversation — a typed testimonial reads as copywriting,
 * whereas a chat thread with the customer's own words is evidence. So the
 * section is a wall of them.
 *
 * Columns scroll in alternating directions at slightly different speeds. The
 * offset speeds matter: identical timing makes the grid read as one sliding
 * block, while staggered timing reads as a living wall. It is pure CSS —
 * the transform runs on the compositor, so a phone stays at 60fps.
 */

/** Per-column direction and pace. Prime-ish durations keep them out of sync. */
const COLUMNS = [
  { dir: "up", duration: "46s" },
  { dir: "down", duration: "38s" },
  { dir: "up", duration: "52s" },
] as const;

export async function ReviewsSection() {
  const [storeStats, screenshots] = await Promise.all([
    getStoreStats(),
    getReviewScreenshots(),
  ]);

  /**
   * The wall only renders when there is something real to put in it.
   *
   * It used to be one demo image repeated nine times under invented places and
   * dates — beside a line promising that every screenshot came from a verified
   * order and was shared with permission. That sentence was false, and it was
   * false in the one place where being wrong actually matters. The section now
   * shows what the database has consent for, and nothing when it has none.
   */
  const columns = COLUMNS.map((_, i) =>
    screenshots.filter((s) => s.column % COLUMNS.length === i),
  );
  const hasWall = screenshots.length > 0;

  return (
    <section
      aria-labelledby="reviews-heading"
      className="group/wall container-page"
    >
      <div className="relative overflow-hidden rounded-card bg-linear-to-br from-brand-soft via-surface to-surface-2 ring-1 ring-line">
        {/* Warm glow behind the wall so the cards sit on something */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-200/40 blur-3xl"
        />

        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-center lg:gap-12 lg:p-10">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-on uppercase">
              <MessageCircle aria-hidden className="size-4" />
              Real conversations
            </p>
            <h2
              id="reviews-heading"
              className="mt-2 text-2xl leading-tight font-extrabold text-ink sm:text-3xl lg:text-4xl"
            >
              What our customers actually say
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2 sm:text-base">
              {hasWall
                ? "Not polished testimonials — screenshots of real messages from buyers across Bangladesh, after their parcel arrived."
                : "Ratings left by buyers across Bangladesh after their parcel arrived."}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md sm:grid-cols-4 lg:grid-cols-2">
              <Stat
                value={`${storeStats.ratingAverage}`}
                label="Average rating"
                icon
              />
              <Stat
                value={`${compactCount(storeStats.ratingCount)}+`}
                label="Ratings"
              />
              <Stat
                value={`${compactCount(storeStats.ordersDelivered)}+`}
                label="Orders delivered"
              />
              <Stat
                value={String(storeStats.districtsCovered)}
                label="Districts covered"
              />
            </dl>

            {hasWall && (
              <p className="mt-5 flex items-start gap-2 text-xs text-ink-3">
                <BadgeCheck
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-success"
                />
                Every screenshot is from a verified order and shared with the
                customer&apos;s permission.
              </p>
            )}
          </div>

          {/* The wall. Tilted very slightly on large screens so it reads as a
              surface receding into the page rather than a flat grid. */}
          {hasWall && (
            <div
              className={cn(
                "relative h-[26rem] sm:h-[30rem] lg:h-[34rem]",
                "lg:[transform:perspective(1600px)_rotateY(-7deg)_rotateX(1.5deg)]",
              )}
            >
              <div className="mask-fade-y grid h-full grid-cols-2 gap-3 overflow-hidden sm:grid-cols-3 sm:gap-4">
                {COLUMNS.map((column, columnIndex) => {
                  const shots = columns[columnIndex];
                  if (shots.length === 0) return null;

                  return (
                    <div
                      key={column.duration}
                      // Third column only appears once there is room for it.
                      className={cn(
                        "relative",
                        columnIndex === 2 && "hidden sm:block",
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-col gap-3 sm:gap-4",
                          column.dir === "up"
                            ? "scroll-col-up"
                            : "scroll-col-down",
                          // Pausing on hover lets someone actually read one.
                          "group-hover/wall:[animation-play-state:paused]",
                        )}
                        style={
                          {
                            "--scroll-duration": column.duration,
                          } as React.CSSProperties
                        }
                      >
                        {/* Rendered twice: the -50% keyframe relies on the
                            second copy being pixel-identical to the first. */}
                        {[0, 1].map((copy) =>
                          shots.map((shot) => (
                            <figure
                              key={`${copy}-${shot.id}`}
                              aria-hidden={copy === 1}
                              className="overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-line"
                            >
                              <Image
                                src={shot.url}
                                alt={copy === 0 ? shot.alt : ""}
                                width={shot.width}
                                height={shot.height}
                                sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 46vw"
                                className="h-auto w-full"
                              />
                              {shot.caption && (
                                <figcaption className="flex items-center gap-1 border-t border-line px-2 py-1.5 text-[10px] leading-tight text-ink-3">
                                  <BadgeCheck
                                    aria-hidden
                                    className="size-3 shrink-0 text-success"
                                  />
                                  <span className="clamp-1">
                                    {shot.caption}
                                  </span>
                                </figcaption>
                              )}
                            </figure>
                          )),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  icon = false,
}: {
  value: string;
  label: string;
  icon?: boolean;
}) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="flex items-center gap-1 text-xl font-extrabold text-ink tnum sm:text-2xl">
          {value}
          {icon && <Star aria-hidden className="size-4 fill-gold text-gold" />}
        </span>
        <span className="mt-0.5 block text-[11px] leading-tight text-ink-3 sm:text-xs">
          {label}
        </span>
      </dd>
    </div>
  );
}
