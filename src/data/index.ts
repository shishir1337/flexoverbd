import { searchProducts } from "@/lib/search";
import { categoryBySlug } from "./categories";
import { products } from "./products";
import type { CategorySlug, Product, Subcategory } from "./types";

export * from "./banners";
export * from "./categories";
export * from "./product-detail";
export * from "./products";
export * from "./reviews";
export type * from "./types";

/* --------------------------------------------------------------------------
 * Selectors — the homepage reads through these, never through raw arrays,
 * so swapping in a real API later is a one-file change.
 * ----------------------------------------------------------------------- */

export function getFlashSaleProducts(): Product[] {
  return products
    .filter((p) => p.flash)
    .sort(
      (a, b) => (b.flash?.claimedPercent ?? 0) - (a.flash?.claimedPercent ?? 0),
    );
}

export function getBestSellers(limit = 10): Product[] {
  return [...products].sort((a, b) => b.sold - a.sold).slice(0, limit);
}

export function getNewArrivals(limit = 10): Product[] {
  return products.filter((p) => p.badge === "new").slice(0, limit);
}

export function getTopRated(limit = 10): Product[] {
  return [...products]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

/* ----------------------------- Subcategories ---------------------------- */

/** Resolves a product to the subcategory it belongs to, joined on the name. */
export function getSubcategory(product: Product): Subcategory | null {
  const category = categoryBySlug.get(product.category);
  return (
    category?.subcategories.find((s) => s.name === product.subcategory) ?? null
  );
}

export function getProductsBySubcategory(
  category: CategorySlug,
  subcategorySlug: string,
  limit = 24,
): Product[] {
  const sub = categoryBySlug
    .get(category)
    ?.subcategories.find((s) => s.slug === subcategorySlug);
  if (!sub) return [];
  return products
    .filter((p) => p.category === category && p.subcategory === sub.name)
    .slice(0, limit);
}

/** How many demo products sit in each subcategory, keyed `category/sub`. */
export const subcategoryCounts: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const product of products) {
    const sub = getSubcategory(product);
    if (sub) {
      const key = `${product.category}/${sub.slug}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
})();

/**
 * Products join to subcategories by name, which is a string match and would
 * fail silently — a typo would just quietly drop items out of a listing. This
 * runs at module load, so a mismatch breaks the build instead.
 */
function assertSubcategories() {
  const orphans = products
    .filter((p) => !getSubcategory(p))
    .map((p) => `${p.slug} → ${p.category}/"${p.subcategory}"`);

  if (orphans.length > 0) {
    throw new Error(
      `Products reference subcategories that no category declares:\n  ${orphans.join("\n  ")}`,
    );
  }
}

assertSubcategories();

export function getProductsByCategory(
  slug: CategorySlug,
  limit = 8,
): Product[] {
  return products.filter((p) => p.category === slug).slice(0, limit);
}

/**
 * Queries shown under the search field. Real stores derive these from logs;
 * here they are chosen to reflect what the catalogue actually stocks.
 *
 * `assertTrendingSearches()` below fails the build if any of them stop
 * returning results — these were silently broken once already, when the
 * catalogue was rebuilt and terms like "panjabi" and "kurti" were left behind
 * pointing at products that no longer existed.
 */
export const trendingSearches = [
  "watch",
  "earbuds",
  "perfume",
  "sunglasses",
  "backpack",
  "cricket",
  "mascara",
  "shirt",
] as const;

export const announcements = [
  "Free delivery on orders over ৳2,000",
  "Cash on delivery available in all 64 districts",
  "7 days easy return — no questions asked",
  "100% authentic products, sourced directly",
] as const;

/**
 * Guards the search-suggestion chips against catalogue drift. A trending term
 * that returns nothing is a dead end presented as a shortcut, so it fails the
 * build rather than shipping.
 */
function assertTrendingSearches() {
  const dead = trendingSearches.filter(
    (term) => searchProducts(products, term).length === 0,
  );

  if (dead.length > 0) {
    throw new Error(
      `Trending search terms return no products: ${dead.join(", ")}. Update trendingSearches or add a synonym in lib/search.ts.`,
    );
  }
}

assertTrendingSearches();
