import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Media } from "@/components/ui/media";
import { cn } from "@/lib/utils";
import { getPromoTiles, getWideBanner } from "@/server/services/content";
import { BANNER_TONE } from "./banner-tone";

/** Two campaign cards. Stacked on phones, side by side from tablet up. */
export async function PromoTiles() {
  const promoTiles = await getPromoTiles();

  return (
    <section aria-label="Current promotions" className="container-page">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {promoTiles.map((tile) => {
          const tone = BANNER_TONE[tile.tone];

          return (
            <Link
              key={tile.id}
              href={tile.href}
              className="group relative overflow-hidden rounded-card ring-1 ring-ink/10 tap"
            >
              <div className="relative aspect-2/1 sm:aspect-3/2 lg:aspect-2/1">
                <Media
                  asset={tile.image}
                  sizes="(min-width: 640px) 45vw, 92vw"
                  tone={tile.tone}
                  className="transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-105"
                />
                {/* Copy sits on the left at every size here, so one horizontal
                    scrim is enough. */}
                <div
                  aria-hidden
                  className={cn("absolute inset-0", tone.scrimDesktop)}
                />

                <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6">
                  <h3
                    className={cn(
                      "max-w-[68%] text-lg leading-tight font-extrabold sm:text-xl lg:text-2xl",
                      tone.title,
                    )}
                  >
                    {tile.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 max-w-[68%] text-xs sm:text-sm",
                      tone.subtitle,
                    )}
                  >
                    {tile.subtitle}
                  </p>
                  <span
                    className={buttonStyles(
                      "primary",
                      "sm",
                      "mt-3 w-fit transition-transform duration-200 group-hover:translate-x-1",
                    )}
                  >
                    {tile.cta}
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Full-width strip between the product sections — a breather in the rhythm. */
export async function WideBanner() {
  const wideBanner = await getWideBanner();
  if (!wideBanner) return null;

  const tone = BANNER_TONE[wideBanner.tone];

  return (
    <section aria-label={wideBanner.title} className="container-page">
      <div className="relative overflow-hidden rounded-card ring-1 ring-ink/10">
        <div className="relative aspect-16/10 sm:aspect-[3/1] lg:aspect-[20/7]">
          <Media
            asset={wideBanner.image}
            sizes="(min-width: 1440px) 1376px, 100vw"
            tone={wideBanner.tone}
          />
          <div
            aria-hidden
            className={cn("absolute inset-0", tone.scrimDesktop)}
          />

          <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-8 lg:p-12">
            <p className="mb-1.5 text-2xs font-bold tracking-widest text-brand-500 uppercase sm:text-xs">
              1 year warranty
            </p>
            <h2
              className={cn(
                "max-w-md text-xl leading-tight font-extrabold sm:text-3xl lg:text-4xl",
                tone.title,
              )}
            >
              {wideBanner.title}
            </h2>
            <p
              className={cn(
                "mt-2 max-w-sm text-xs sm:text-base",
                tone.subtitle,
              )}
            >
              {wideBanner.subtitle}
            </p>
            <Link
              href={wideBanner.href}
              className={buttonStyles("primary", "md", "mt-4 w-fit")}
            >
              {wideBanner.cta}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
