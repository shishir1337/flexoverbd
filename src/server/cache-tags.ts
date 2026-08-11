/**
 * Cache tag registry.
 *
 * Every cached read tags itself from here, and every admin mutation invalidates
 * from here. Keeping both sides in one file is what stops the classic failure
 * where a new query is cached but nothing ever invalidates it, so the
 * storefront quietly serves week-old prices.
 *
 * Two invalidation verbs, and the difference matters:
 *   • `updateTag`     — Server Actions only. Expires immediately; the next read
 *                       waits for fresh data. Use for the record just edited so
 *                       the admin sees their own write.
 *   • `revalidateTag` — Actions and Route Handlers. Serves stale while
 *                       refreshing. Use for broad collections where a few
 *                       seconds of staleness is fine.
 */

export const tags = {
  // Catalogue
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  brands: "brands",
  flashSale: "flash-sale",

  // Merchandising
  banners: "banners",
  announcements: "announcements",
  trending: "trending",
  trustItems: "trust-items",
  navLinks: "nav-links",

  // Content
  pages: "pages",
  page: (slug: string) => `page:${slug}`,
  faq: "faq",
  reviews: "reviews",
  productReviews: (productId: string) => `reviews:${productId}`,
  screenshots: "screenshots",

  // Configuration
  settings: "settings",
  setting: (key: string) => `setting:${key}`,
  delivery: "delivery",
} as const;

/**
 * Tags to bust when a product changes. Listings, the flash rail and search all
 * read denormalised product rows, so a price edit has to reach further than the
 * one detail page.
 */
export function productTags(slug: string): string[] {
  return [tags.products, tags.product(slug), tags.flashSale];
}

export function categoryTags(slug: string): string[] {
  return [tags.categories, tags.category(slug), tags.products];
}
