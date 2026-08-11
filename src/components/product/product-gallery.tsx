"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Product gallery.
 *
 * The slides arrive as server-rendered nodes because `<Media>` reads the
 * filesystem to decide between the real photo and a placeholder — so it cannot
 * run on the client. This component only owns the scroll position.
 *
 * The track is a native scroll-snap container, which means swiping works on
 * touch with no JavaScript at all; the thumbnails just drive `scrollTo` and
 * read back the active index. One mechanism, both input methods.
 */
export function ProductGallery({
  slides,
  thumbs,
  alts,
}: {
  slides: ReactNode[];
  thumbs: ReactNode[];
  alts: string[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function show(index: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  const single = slides.length <= 1;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        // `single` drops snapping so a lone image cannot be nudged sideways.
        className={cn(
          "no-scrollbar relative flex overflow-x-auto rounded-card border border-line bg-surface",
          !single && "snap-x snap-mandatory",
        )}
      >
        {slides.map((slide, i) => (
          <div
            key={alts[i]}
            className="relative aspect-square w-full shrink-0 snap-start"
            aria-hidden={i !== active}
          >
            {slide}
          </div>
        ))}
      </div>

      {!single && (
        <>
          {/* Dots for touch, where the thumbnails are easy to miss */}
          <div className="flex justify-center gap-1.5 sm:hidden">
            {slides.map((_, i) => (
              <span
                key={alts[i]}
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 ease-(--ease-out-soft)",
                  i === active ? "w-5 bg-brand-500" : "w-1.5 bg-line-strong",
                )}
              />
            ))}
          </div>

          <ul className="hidden gap-2 sm:flex">
            {thumbs.map((thumb, i) => (
              <li key={alts[i]}>
                <button
                  type="button"
                  onClick={() => show(i)}
                  aria-label={`Show image ${i + 1} of ${slides.length}`}
                  aria-current={i === active}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-lg border-2 bg-surface tap transition-colors duration-200",
                    i === active
                      ? "border-brand-500"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  {thumb}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
