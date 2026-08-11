import { Check, Star, X } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/data/types";
import {
  activeFilterCount,
  brandFacets,
  buildHref,
  type ListingSearchParams,
  type ListingState,
  PRICE_BUCKETS,
  toggleInList,
} from "@/lib/listing";
import { cn } from "@/lib/utils";

/**
 * Every control is a link, not a checkbox.
 *
 * That means the whole filter panel is server-rendered with no JavaScript at
 * all: each option is just a URL with one param flipped. It also gives
 * middle-click-to-open-in-new-tab and correct back-button behaviour for free,
 * which a JS filter store has to reimplement badly.
 */
export function ListingFilters({
  pathname,
  params,
  state,
  /** Products *before* filtering, so brand facets do not vanish as you narrow. */
  pool,
}: {
  pathname: string;
  params: ListingSearchParams;
  state: ListingState;
  pool: Product[];
}) {
  const brands = brandFacets(pool).slice(0, 8);
  const active = activeFilterCount(state);

  return (
    <div className="flex flex-col gap-5">
      {active > 0 && (
        <Link
          href={pathname}
          className="flex items-center justify-between rounded-btn bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-on tap hover:bg-brand-100"
        >
          Clear all filters
          <X aria-hidden className="size-4" />
        </Link>
      )}

      <FilterGroup title="Price">
        {PRICE_BUCKETS.map((bucket) => (
          <FilterLink
            key={bucket.key}
            href={buildHref(pathname, params, {
              price: state.price === bucket.key ? null : bucket.key,
            })}
            selected={state.price === bucket.key}
          >
            {bucket.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Customer rating">
        {[4, 3].map((min) => (
          <FilterLink
            key={min}
            href={buildHref(pathname, params, {
              rating: state.rating === min ? null : String(min),
            })}
            selected={state.rating === min}
          >
            <span className="flex items-center gap-1">
              <Star aria-hidden className="size-3.5 fill-gold text-gold" />
              {min} & above
            </span>
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="Offers">
        <FilterLink
          href={buildHref(pathname, params, { deal: state.deal ? null : "1" })}
          selected={state.deal}
        >
          On discount
        </FilterLink>
        <FilterLink
          href={buildHref(pathname, params, { free: state.free ? null : "1" })}
          selected={state.free}
        >
          Free delivery
        </FilterLink>
        <FilterLink
          href={buildHref(pathname, params, {
            stock: state.stock ? null : "1",
          })}
          selected={state.stock}
        >
          In stock only
        </FilterLink>
      </FilterGroup>

      {brands.length > 1 && (
        <FilterGroup title="Brand">
          {brands.map(({ brand, count }) => (
            <FilterLink
              key={brand}
              href={buildHref(pathname, params, {
                brand: toggleInList(state.brands, brand),
              })}
              selected={state.brands.includes(brand)}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="clamp-1">{brand}</span>
                <span className="shrink-0 text-xs text-ink-3 tnum">
                  {count}
                </span>
              </span>
            </FilterLink>
          ))}
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-3 uppercase">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterLink({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-pressed={selected}
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-btn px-2 py-1.5 text-sm tap transition-colors",
          selected
            ? "bg-brand-soft font-semibold text-brand-on"
            : "text-ink-2 hover:bg-surface-2",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded border transition-colors",
            selected ? "border-brand-600 bg-brand-600" : "border-line-strong",
          )}
        >
          {selected && <Check className="size-3 text-white" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">{children}</span>
      </Link>
    </li>
  );
}
