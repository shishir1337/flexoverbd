import { PackageSearch, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { buttonStyles } from "@/components/ui/button";
import type { Product } from "@/data/types";
import {
  activeFilterCount,
  applyFilters,
  applySort,
  buildHref,
  type ListingSearchParams,
  parseListingParams,
} from "@/lib/listing";
import { FilterSheet } from "./filter-sheet";
import { ListingFilters } from "./listing-filters";
import { SortSelect } from "./sort-select";

/**
 * Shared listing body for category, subcategory, search and every curated
 * page. Filters live in a sidebar from `lg` up and in a bottom sheet on mobile.
 * Either way the panel itself is the same server-rendered list of links, so
 * filter state lives in the URL and cannot desync from what is on screen.
 */
export function ProductListing({
  pathname,
  params,
  products,
  emptyMessage = "No products match these filters.",
}: {
  pathname: string;
  params: ListingSearchParams;
  /** The full set for this page, before filtering. */
  products: Product[];
  emptyMessage?: string;
}) {
  const state = parseListingParams(params);
  const filtered = applyFilters(products, state);
  const sorted = applySort(filtered, state.sort);
  const visible = sorted.slice(0, state.show);
  const active = activeFilterCount(state);

  const filterPanel = (
    <ListingFilters
      pathname={pathname}
      params={params}
      state={state}
      pool={products}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters
          </h2>
          {filterPanel}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone: the count gets its own line and Filters/Sort split the next
            one evenly. On one line all three fought for ~288px and the sort
            control collapsed to 57px — too narrow to read "Most popular". */}
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-3">
            <span className="font-bold text-ink tnum">{sorted.length}</span>{" "}
            {sorted.length === 1 ? "product" : "products"}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <FilterSheet
              activeCount={active}
              resultCount={sorted.length}
              clearHref={pathname}
            >
              {filterPanel}
            </FilterSheet>
            <SortSelect
              pathname={pathname}
              params={params}
              value={state.sort}
              className="min-w-0 flex-1 sm:flex-none"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-card border border-line bg-surface-2 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-surface">
              <PackageSearch aria-hidden className="size-6 text-ink-4" />
            </span>
            <p className="mt-3 text-base font-bold text-ink">
              Nothing to show here
            </p>
            <p className="mt-1 max-w-xs text-sm text-ink-2">{emptyMessage}</p>
            {active > 0 && (
              <Link
                href={pathname}
                className={buttonStyles("primary", "md", "mt-5")}
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {sorted.length > visible.length && (
              // A link, not a button: "show more" stays crawlable and the
              // longer view is a real, shareable URL.
              <div className="mt-8 flex justify-center">
                <Link
                  href={buildHref(pathname, params, {
                    show: String(state.show + 24),
                  })}
                  scroll={false}
                  className={buttonStyles("secondary", "lg", "min-w-56")}
                >
                  Show more ({sorted.length - visible.length} left)
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
