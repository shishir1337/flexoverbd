"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { BannerTone } from "@/data/types";
import { cn } from "@/lib/utils";
import { BANNER_TONE } from "./banner-tone";

/**
 * Thin client shell around server-rendered slides.
 *
 * Slides arrive as `children` so the artwork stays in Server Components — the
 * hero image is the LCP element and it ships inside the initial HTML, with
 * Embla only taking over interaction after hydration. Autoplay is skipped
 * entirely for users who ask for reduced motion.
 */
export function HeroCarousel({
  children,
  count,
  labels,
  tones,
}: {
  children: ReactNode;
  count: number;
  labels: string[];
  /** Per-slide artwork tone — the controls restyle as the slide changes so
   *  they never end up white-on-white over a pale banner. */
  tones: BannerTone[];
}) {
  const [reduced, setReduced] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", duration: 28, skipSnaps: false },
    reduced
      ? []
      : [
          Autoplay({
            delay: 5500,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  const tone = BANNER_TONE[tones[selected] ?? "dark"];

  return (
    <section aria-roledescription="carousel" aria-label="Featured promotions">
      <div className="relative">
        <div
          ref={emblaRef}
          // The hairline keeps the card's bounds legible against the white page
          // on pale banners, where the artwork alone gives no edge.
          className="overflow-hidden rounded-card ring-1 ring-ink/10"
        >
          <div className="flex touch-pan-y">{children}</div>
        </div>

        {/* Arrows live together in the bottom-right corner rather than pinned
            to the left and right edges. Every slide composes its headline into
            the left of the frame, so a vertically-centred left arrow lands on
            top of the copy — and its partner ends up marooned in empty space.
            Desktop-only: on touch the swipe gesture is the control, and extra
            chrome would just cover the artwork. */}
        <div className="absolute right-4 bottom-4 hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous slide"
            className={cn(
              "grid size-11 place-items-center rounded-full shadow-card backdrop-blur-sm tap transition-colors duration-200",
              tone.control,
            )}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next slide"
            className={cn(
              "grid size-11 place-items-center rounded-full shadow-card backdrop-blur-sm tap transition-colors duration-200",
              tone.control,
            )}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        {/* Dots stay centred on mobile, but shift under the copy on desktop so
            they never crowd the arrow cluster. */}
        <div // Offsets are small because each dot button is 44px tall for touch; the
          // visible bar sits at its centre, so the container hugs the edge.
          className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 sm:bottom-1 lg:inset-x-auto lg:left-11 lg:justify-start"
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={labels[i] ?? i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}: ${labels[i] ?? ""}`}
              aria-current={i === selected}
              // min-w-6 keeps the hit area at WCAG 2.5.8's 24px floor: the
              // visible bar is only 6px wide, and px-1 alone made the button
              // 14px — a miss-prone target on the busiest control on the page.
              className="relative grid h-11 min-w-6 place-items-center px-1 tap"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300 ease-(--ease-out-soft)",
                  i === selected
                    ? `w-6 ${tone.dotActive}`
                    : `w-1.5 ${tone.dot}`,
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
