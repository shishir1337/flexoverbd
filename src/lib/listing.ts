import type { Product } from "@/data/types";
import { discountPercent } from "./utils";

/**
 * Listing state lives entirely in the URL.
 *
 * That keeps every listing page a Server Component — no client store, no
 * hydration cost for the filter UI — and it means a filtered view is
 * shareable, linkable and back-button-correct. A shopper who sends a friend
 * "the sunglasses under ৳1500" sends a URL that actually reproduces it.
 */

export type SortKey =
  | "popular"
  | "newest"
  | "price-low"
  | "price-high"
  | "rating"
  | "discount";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Most popular" },
  { key: "newest", label: "Newest first" },
  { key: "price-low", label: "Price: low to high" },
  { key: "price-high", label: "Price: high to low" },
  { key: "rating", label: "Customer rating" },
  { key: "discount", label: "Biggest discount" },
];

/** Price buckets in BDT, chosen around where this catalogue actually sits. */
export const PRICE_BUCKETS = [
  { key: "0-1000", label: "Under ৳1,000", min: 0, max: 1000 },
  { key: "1000-2000", label: "৳1,000 – ৳2,000", min: 1000, max: 2000 },
  { key: "2000-3500", label: "৳2,000 – ৳3,500", min: 2000, max: 3500 },
  {
    key: "3500-",
    label: "৳3,500 & above",
    min: 3500,
    max: Number.MAX_SAFE_INTEGER,
  },
] as const;

export type ListingSearchParams = {
  sort?: string;
  price?: string;
  rating?: string;
  brand?: string;
  deal?: string;
  stock?: string;
  free?: string;
  show?: string;
};

export type ListingState = {
  sort: SortKey;
  price?: string;
  rating?: number;
  brands: string[];
  deal: boolean;
  stock: boolean;
  free: boolean;
  show: number;
};

const DEFAULT_SHOW = 24;

export function parseListingParams(params: ListingSearchParams): ListingState {
  const sort = SORT_OPTIONS.some((o) => o.key === params.sort)
    ? (params.sort as SortKey)
    : "popular";

  const rating = Number(params.rating);
  const show = Number(params.show);

  return {
    sort,
    price: PRICE_BUCKETS.some((b) => b.key === params.price)
      ? params.price
      : undefined,
    rating: rating >= 3 && rating <= 5 ? rating : undefined,
    brands: params.brand ? params.brand.split(",").filter(Boolean) : [],
    deal: params.deal === "1",
    stock: params.stock === "1",
    free: params.free === "1",
    show:
      Number.isFinite(show) && show > 0 ? Math.min(show, 200) : DEFAULT_SHOW,
  };
}

/** Price actually charged — flash-sale members are cheaper than list price. */
export function effectivePrice(product: Product): number {
  return product.flash?.price ?? product.price;
}

export function applyFilters(
  products: Product[],
  state: ListingState,
): Product[] {
  const bucket = PRICE_BUCKETS.find((b) => b.key === state.price);

  return products.filter((product) => {
    const price = effectivePrice(product);

    if (bucket && (price < bucket.min || price > bucket.max)) return false;
    if (state.rating && product.rating < state.rating) return false;
    if (state.brands.length && !state.brands.includes(product.brand))
      return false;
    if (state.deal && discountPercent(price, product.compareAt) === 0)
      return false;
    if (state.stock && product.stock <= 0) return false;
    if (state.free && !product.freeDelivery) return false;

    return true;
  });
}

export function applySort(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products];

  switch (sort) {
    case "price-low":
      return sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-high":
      return sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "rating":
      return sorted.sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      );
    case "discount":
      return sorted.sort(
        (a, b) =>
          discountPercent(effectivePrice(b), b.compareAt) -
          discountPercent(effectivePrice(a), a.compareAt),
      );
    case "newest":
      // No timestamps in the demo data, so "new" badges lead and the rest
      // fall back to catalogue order reversed — newest ids first.
      return sorted.sort((a, b) => {
        const an = a.badge === "new" ? 1 : 0;
        const bn = b.badge === "new" ? 1 : 0;
        return bn - an || b.id.localeCompare(a.id);
      });
    default:
      return sorted.sort((a, b) => b.sold - a.sold);
  }
}

/** Brands present in a result set, with counts, for the filter sidebar. */
export function brandFacets(products: Product[]) {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}

/**
 * Builds an href with some params changed. `null` removes a param, and any
 * change resets pagination — otherwise narrowing a filter while "show=96" is
 * set would render an oddly long page of three results.
 */
export function buildHref(
  pathname: string,
  current: ListingSearchParams,
  changes: Record<string, string | null>,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  if (!("show" in changes)) next.delete("show");

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Toggles one value inside a comma-separated param such as `brand`. */
export function toggleInList(list: string[], value: string): string | null {
  const next = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
  return next.length ? next.join(",") : null;
}

export function activeFilterCount(state: ListingState): number {
  return (
    (state.price ? 1 : 0) +
    (state.rating ? 1 : 0) +
    state.brands.length +
    (state.deal ? 1 : 0) +
    (state.stock ? 1 : 0) +
    (state.free ? 1 : 0)
  );
}
