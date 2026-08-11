import type { MetadataRoute } from "next";
import { getProductSlugs } from "@/server/services/catalog";
import {
  getCategorySlugs,
  getSubcategoryParams,
} from "@/server/services/categories";
import { getSiteSettings } from "@/server/services/settings";

/**
 * Built from the database, so the sitemap can never advertise a URL that 404s:
 * unpublishing a product removes it from both the site and this file on the
 * next revalidation.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categorySlugs, productSlugs, subcategories, site] = await Promise.all([
    getCategorySlugs(),
    getProductSlugs(),
    getSubcategoryParams(),
    getSiteSettings(),
  ]);

  return [
    {
      url: site.url,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categorySlugs.map((slug) => ({
      url: `${site.url}/category/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // Curated listings and the written pages are all real destinations.
    ...[
      "/categories",
      "/offers",
      "/best-sellers",
      "/new-arrivals",
      "/top-rated",
      "/track-order",
      "/about",
      "/contact",
      "/faq",
      "/shipping",
      "/refund-policy",
      "/privacy",
      "/terms",
    ].map((path) => ({
      url: `${site.url}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/categories" || path === "/offers" ? 0.8 : 0.5,
    })),
    ...productSlugs.map((slug) => ({
      url: `${site.url}/product/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...subcategories.map(({ slug, sub }) => ({
      url: `${site.url}/category/${slug}/${sub}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
