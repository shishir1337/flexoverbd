"use client";

import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile filter bottom sheet.
 *
 * Deliberately stays open while you tap filters. Every option is a link, so
 * each tap is a navigation — closing on route change would kick you out after
 * a single choice and make stacking filters a four-tap-per-filter chore. The
 * server re-renders the count in the footer button as you go, and you leave
 * when you are done rather than when the router says so.
 *
 * The panel content itself is still the server-rendered, zero-JS link list;
 * this component only supplies the container, the gesture and the focus
 * management.
 */
export function FilterSheet({
  children,
  activeCount,
  resultCount,
  clearHref,
}: {
  children: React.ReactNode;
  activeCount: number;
  resultCount: number;
  clearHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const items = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Drag-to-dismiss. Only downward travel is tracked — dragging up must not
  // let the sheet grow past its own height and expose the page behind it.
  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;
    setDrag(Math.max(0, e.clientY - startY.current));
  }
  function onPointerUp() {
    if (startY.current === null) return;
    // ~25% of the sheet is the usual commit threshold; below that it springs
    // back so a scroll that starts on the handle is not read as a dismiss.
    const height = panelRef.current?.offsetHeight ?? 400;
    if (drag > Math.min(120, height * 0.25)) setOpen(false);
    setDrag(0);
    startY.current = null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-btn border border-line bg-surface px-3.5 text-sm font-bold text-ink tap hover:bg-surface-2 lg:hidden"
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        Filters
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 py-0.5 text-2xs font-bold text-white tnum">
            {activeCount}
          </span>
        )}
      </button>

      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 bg-scrim/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ zIndex: "var(--z-scrim)" }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label="Filters"
        inert={!open}
        className={cn(
          "fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface shadow-pop lg:hidden",
          // Only transition when it is not being dragged, or the sheet would
          // lag a finger by the full 300ms.
          drag === 0 &&
            "transition-transform duration-300 ease-(--ease-out-soft)",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{
          zIndex: "var(--z-drawer)",
          ...(drag > 0 ? { transform: `translateY(${drag}px)` } : {}),
        }}
      >
        {/* Grab area. touch-none stops the browser claiming the gesture for
            a page scroll before the pointer handlers see it. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 cursor-grab touch-none pt-2.5 pb-1 active:cursor-grabbing"
        >
          <span
            aria-hidden
            className="mx-auto block h-1.5 w-10 rounded-full bg-line-strong"
          />
        </div>

        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-on tnum">
                {activeCount}
              </span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="grid size-11 place-items-center rounded-full text-ink-2 tap hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>

        <footer className="flex shrink-0 items-center gap-2.5 border-t border-line bg-surface p-3 pb-safe">
          {activeCount > 0 && (
            <Link
              href={clearHref}
              className="flex h-12 shrink-0 items-center rounded-btn border border-line px-4 text-sm font-bold text-ink-2 tap hover:bg-surface-2"
            >
              Clear all
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-12 flex-1 items-center justify-center rounded-btn bg-brand-600 text-[0.9375rem] font-bold text-white tap hover:bg-brand-700"
          >
            Show {resultCount} {resultCount === 1 ? "result" : "results"}
          </button>
        </footer>
      </div>
    </>
  );
}
