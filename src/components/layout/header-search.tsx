"use client";

import { Search, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function HeaderSearch({
  className,
  trendingSearches,
}: {
  className?: string;
  /** Passed from the server header — a client component cannot query. */
  trendingSearches: string[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const panelId = useId();
  const wrapRef = useRef<HTMLElement>(null);

  // Closing on blur directly would fire before a suggestion's click lands, so
  // we defer to the next frame and check where focus actually went.
  function handleBlur() {
    requestAnimationFrame(() => {
      if (!wrapRef.current?.contains(document.activeElement)) setOpen(false);
    });
  }

  return (
    <search
      ref={wrapRef}
      onBlur={handleBlur}
      className={cn("relative", className)}
    >
      <form action="/search">
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>

        <div className="relative flex items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 size-4.5 text-ink-3 sm:left-3.5"
          />
          <input
            id={inputId}
            name="q"
            type="search"
            value={query}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            // combobox (not the implicit searchbox) is the role that actually
            // supports aria-expanded / aria-controls for the suggestions panel.
            role="combobox"
            aria-expanded={open}
            aria-controls={panelId}
            placeholder="Search products…"
            className={cn(
              // Tighter gutters below sm: the field is only ~172px wide once
              // the menu, logo and cart have taken their share of a 360px row.
              // text-base below sm: under 16px, focusing this field zooms the
              // page on iOS and leaves it zoomed.
              "h-11 w-full rounded-chip border border-line bg-surface-2 pr-10 pl-10 text-base text-ink sm:pl-11 sm:text-[0.9375rem]",
              "placeholder:text-ink-3 focus:border-brand-500 focus:bg-surface focus:outline-none",
              "transition-colors duration-200",
              // Kill the native WebKit clear affordance; we render our own.
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 grid size-8 place-items-center rounded-full text-ink-3 tap hover:bg-surface-3 hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>

        {open && (
          <div
            id={panelId}
            className={cn(
              "absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-card border border-line bg-surface shadow-pop",
              "animate-fade-up",
            )}
          >
            <p className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs font-bold tracking-wide text-ink-3 uppercase">
              <TrendingUp aria-hidden className="size-3.5" />
              Trending now
            </p>
            <ul className="pb-2">
              {trendingSearches.map((term) => (
                <li key={term}>
                  <Link
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="flex min-h-11 items-center gap-3 px-4 text-[0.9375rem] text-ink-2 tap hover:bg-surface-2 hover:text-ink"
                  >
                    <Search aria-hidden className="size-4 text-ink-4" />
                    {term}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </search>
  );
}
