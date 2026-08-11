"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroller.
 *
 * The track itself stays pure CSS scroll-snap — on touch, native momentum
 * scrolling beats any JS carousel for feel and costs nothing. But a mouse has
 * no horizontal gesture, so on desktop the same track was a dead end: cards
 * visibly cut off at the edge with no way to reach them. These arrows drive
 * the native scroller rather than replacing it, so both inputs share one
 * source of truth and the snap points still apply.
 *
 * Arrows only exist from `lg` up, and only when the content actually
 * overflows — a rail with four items on a wide screen shows none.
 */
/**
 * Gutter presets. Only one of these is ever applied to a rail, so there is no
 * cascade fight over `--rail-pad` — which is why this is a prop rather than
 * something callers pass through `className`.
 */
const PAD = {
  /** Aligned to the page gutters — bleeds to the screen edge on mobile. */
  page: "[--rail-pad:1rem] sm:[--rail-pad:1.5rem] lg:[--rail-pad:2rem]",
  /** For a rail sitting inside a padded panel, e.g. the flash-sale block. */
  panel: "[--rail-pad:0.75rem] sm:[--rail-pad:1rem]",
} as const;

export function Rail({
  children,
  className,
  label,
  pad = "page",
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  /** Describes what is being scrolled, e.g. "flash sale products". */
  label: string;
  pad?: keyof typeof PAD;
  /**
   * `center` centres the row when it is too short to fill the track, so a
   * handful of items doesn't strand a wide gap on the right of a desktop
   * viewport. It uses CSS *safe* centring: the moment the content does
   * overflow it reverts to `start`. Plain `center` would push the leading
   * items past the scroll origin and make them permanently unreachable.
   */
  align?: "start" | "center";
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Both true until measured, which resolves to "no overflow" and keeps the
  // arrows out of the first paint rather than flashing them in.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px slack: sub-pixel layout means scrollLeft rarely hits max exactly.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();
    el.addEventListener("scroll", measure, { passive: true });

    // Catches viewport resize and late-loading images changing scrollWidth.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);

    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function page(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    // Just under a full viewport keeps a card of context visible across the
    // jump, so the user never loses their place in the row.
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  const overflows = !(atStart && atEnd);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "rail no-scrollbar gap-3 pb-1 sm:gap-4",
          PAD[pad],
          align === "center" && "justify-center-safe",
          className,
        )}
      >
        {children}
        {/* Trailing spacer so the last card can snap clear of the edge */}
        <div aria-hidden className="rail-item w-px" />
      </div>

      {overflows && (
        <>
          <RailButton
            direction="prev"
            label={label}
            disabled={atStart}
            onClick={() => page(-1)}
          />
          <RailButton
            direction="next"
            label={label}
            disabled={atEnd}
            onClick={() => page(1)}
          />
        </>
      )}
    </div>
  );
}

function RailButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scroll ${label} ${isPrev ? "left" : "right"}`}
      // Hidden from assistive tech: the track is natively scrollable and
      // keyboard-reachable, so these are a pointer convenience only.
      tabIndex={-1}
      className={cn(
        "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full",
        "border border-line bg-surface/95 text-ink shadow-card backdrop-blur-sm",
        "transition-[opacity,background-color] duration-200 hover:bg-surface lg:grid",
        isPrev ? "-left-2" : "-right-2",
        disabled && "pointer-events-none opacity-0",
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
