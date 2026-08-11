import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Media } from "@/components/ui/media";
import { cn } from "@/lib/utils";
import { getHeroBanners } from "@/server/services/content";
import { BANNER_TONE } from "./banner-tone";
import { HeroCarousel } from "./hero-carousel";

/**
 * Copy is live HTML over photographic artwork rather than baked into the
 * image. That keeps headlines crisp at every DPR, indexable, translatable, and
 * editable without a trip back to the image generator — and it means the
 * mobile and desktop crops can share one set of words.
 */
export async function Hero() {
  const heroBanners = await getHeroBanners();

  return (
    <div className="container-page pt-3 sm:pt-4">
      <HeroCarousel
        count={heroBanners.length}
        labels={heroBanners.map((b) => b.title)}
        tones={heroBanners.map((b) => b.tone)}
      >
        {heroBanners.map((banner, i) => {
          const tone = BANNER_TONE[banner.tone];

          return (
            // biome-ignore lint/a11y/useSemanticElements: role="group" plus aria-roledescription="slide" is the WAI-ARIA carousel pattern; <fieldset> would be wrong here.
            <div
              key={banner.id}
              className="relative w-full flex-none"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${heroBanners.length}`}
            >
              <div className="relative aspect-square overflow-hidden sm:aspect-16/9 lg:aspect-[21/9]">
                {/* Two crops: a square that keeps the subject readable on a
                    phone, and a 21:9 that fills a desktop viewport. Only one is
                    ever downloaded. */}
                <div className="absolute inset-0 sm:hidden">
                  <Media
                    asset={banner.imageMobile}
                    sizes="100vw"
                    priority={i === 0}
                    tone={banner.tone}
                  />
                </div>
                <div className="absolute inset-0 hidden sm:block">
                  <Media
                    asset={banner.imageDesktop}
                    sizes="(min-width: 1440px) 1376px, 100vw"
                    priority={i === 0}
                    tone={banner.tone}
                  />
                </div>

                {/* Separate scrims per breakpoint: the copy sits at the bottom
                    on phones and on the left from sm up, so the gradient has to
                    run in the matching direction. */}
                <div
                  aria-hidden
                  className={cn("absolute inset-0 sm:hidden", tone.scrimMobile)}
                />
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 hidden sm:block",
                    tone.scrimDesktop,
                  )}
                />

                <div className="absolute inset-0 flex items-end sm:items-center">
                  <div className="w-full p-5 pb-12 sm:max-w-[58%] sm:p-8 sm:pb-8 lg:max-w-[50%] lg:p-12">
                    {banner.eyebrow && (
                      <span
                        className={cn(
                          "mb-2 inline-flex rounded-chip px-2.5 py-1 text-2xs font-bold tracking-wider uppercase",
                          tone.eyebrow,
                        )}
                      >
                        {banner.eyebrow}
                      </span>
                    )}

                    {/* h2, not h1 — three rotating slides must not produce three
                        competing page headings. The page h1 lives in page.tsx. */}
                    <h2
                      className={cn(
                        "text-2xl leading-[1.1] font-extrabold sm:text-4xl lg:text-5xl",
                        tone.title,
                      )}
                    >
                      {banner.title}
                    </h2>
                    <p
                      className={cn(
                        "mt-2 max-w-md text-sm sm:text-base lg:text-lg",
                        tone.subtitle,
                      )}
                    >
                      {banner.subtitle}
                    </p>

                    <Link
                      href={banner.href}
                      className={buttonStyles(
                        "primary",
                        "md",
                        "mt-4 lg:h-12 lg:px-6 lg:text-base",
                      )}
                    >
                      {banner.cta}
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </HeroCarousel>
    </div>
  );
}
