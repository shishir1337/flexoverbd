import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Horizontally scrollable on mobile rather than wrapping — a wrapped
 * breadcrumb on a phone eats two lines above the fold on the page where
 * vertical space matters most.
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="no-scrollbar flex items-center gap-1 overflow-x-auto text-xs whitespace-nowrap text-ink-3">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={item.href ?? item.label}
              className="flex items-center gap-1"
            >
              {i > 0 && (
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-ink-4"
                />
              )}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center rounded px-1 tap transition-colors hover:text-brand-on"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "px-0.5 py-1",
                    last && "font-medium text-ink-2",
                  )}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
