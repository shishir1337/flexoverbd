import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/server/services/settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteSettings();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Transactional and private paths. /admin is also noindexed via
        // metadata — robots.txt is a request, not an access control.
        disallow: [
          "/admin",
          "/cart",
          "/checkout",
          "/account",
          "/wishlist",
          "/search",
          "/api/",
        ],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
