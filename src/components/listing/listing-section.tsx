import { Skeleton } from "@/components/ui/primitives";
import type { Product } from "@/data/types";
import type { ListingSearchParams } from "@/lib/listing";
import { ProductListing } from "./product-listing";

/**
 * The filterable half of a listing page, behind its own boundary.
 *
 * Under Cache Components, awaiting `searchParams` in the page body makes the
 * whole route request-time: the category header, the hero and the subcategory
 * chips — all of which are identical for every visitor — stop being
 * prerendered, and a shopper on a 3G phone waits for the server before seeing
 * anything at all. Next reports this as "encountered runtime data during
 * prerendering".
 *
 * Taking the *promise* rather than the resolved value moves that await behind a
 * `<Suspense>` the page owns, so the shell prerenders and only the grid
 * streams. The filters are a refinement of the page; they are not the page.
 */
export async function ListingSection({
  searchParams,
  pathname,
  products,
  emptyMessage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  pathname: string;
  products: Product[];
  emptyMessage?: string;
}) {
  const params = (await searchParams) as ListingSearchParams;

  return (
    <ProductListing
      pathname={pathname}
      params={params}
      products={products}
      emptyMessage={emptyMessage}
    />
  );
}

/**
 * Sized to the real toolbar and grid so the streamed content lands without
 * moving anything — a listing that reflows on arrival is worse than one that
 * takes a moment longer.
 */
export function ListingSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-11 w-28 rounded-btn" />
        <Skeleton className="h-11 w-40 rounded-btn" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
          <div key={k}>
            <Skeleton className="aspect-square w-full rounded-card" />
            <Skeleton className="mt-2 h-4 w-full rounded" />
            <Skeleton className="mt-1.5 h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
