import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Tabs for a screen that has grown too many sections to scroll.
 *
 * Links driven by a search param, not client state — the same choice the order
 * and product filters make, for the same reasons: a tab someone is looking at
 * stays shareable, survives a refresh, and the back button does what it looks
 * like it does. Client state would lose all three.
 *
 * The panels are rendered by the caller and only the active one is mounted, so
 * a heavy tab costs nothing until it is opened.
 */

export type TabDef = {
  /** Value in the URL. The first tab's value is also the default. */
  key: string;
  label: string;
  /** Optional count, for tabs where "how many" is the useful signal. */
  count?: number;
};

/**
 * Resolves the active tab from a raw search param.
 *
 * Falls back to the first tab rather than rendering nothing when the URL
 * carries a stale or hand-edited value.
 */
export function activeTab(tabs: TabDef[], raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  return tabs.some((t) => t.key === value) ? value : tabs[0].key;
}

export function Tabs({
  tabs,
  active,
  href,
  className,
}: {
  tabs: TabDef[];
  active: string;
  /** Builds the URL for a tab key, so the caller keeps its other params. */
  href: (key: string) => string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Scrolls sideways rather than wrapping: a wrapped tab strip on a
        // phone pushes the panel below the fold, which is the problem tabs
        // were meant to solve.
        "-mx-4 flex gap-1 overflow-x-auto border-line border-b px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={href(tab.key)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 font-semibold text-sm tap transition-colors",
              on
                ? "border-brand-500 text-brand-on"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 tnum",
                  on ? "text-brand-on/70" : "text-ink-4",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
