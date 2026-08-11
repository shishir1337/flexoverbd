import type { Product } from "@/data/types";
import { resolvePublicImage } from "@/lib/public-files";
import { getSiteSettings } from "@/server/services/settings";

/**
 * BreadcrumbList + ItemList for every listing page.
 *
 * Category and subcategory pages are the site's highest-value non-product
 * landing pages — they are what "beauty products bangladesh" style queries
 * actually rank for — and they were shipping with no structured data at all.
 * BreadcrumbList earns the path display in a result instead of a bare URL, and
 * ItemList tells Google what the page is a list *of*.
 *
 * Only the products actually rendered are listed, and each carries the price
 * it is sold at, so the markup can never disagree with the page.
 */
export async function ListingJsonLd({
  name,
  description,
  path,
  products,
  trail = [],
}: {
  name: string;
  description: string;
  /** Page path, leading slash, no query. */
  path: string;
  products: Product[];
  /** Ancestors between Home and this page. */
  trail?: { name: string; path: string }[];
}) {
  const site = await getSiteSettings();

  const url = `${site.url}${path}`;
  const crumbs = [
    { name: "Home", item: site.url },
    ...trail.map((t) => ({ name: t.name, item: `${site.url}${t.path}` })),
    { name, item: url },
  ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name,
        description,
        isPartOf: { "@id": `${site.url}#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.item,
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${url}#items`,
        name,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => {
          const image = resolvePublicImage(p.image.src);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.title,
              url: `${site.url}/product/${p.slug}`,
              ...(image ? { image: `${site.url}${image}` } : {}),
              brand: { "@type": "Brand", name: p.brand },
              offers: {
                "@type": "Offer",
                price: p.flash?.price ?? p.price,
                priceCurrency: site.currency,
                availability:
                  p.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
              },
              ...(p.reviewCount > 0
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: p.rating,
                      reviewCount: p.reviewCount,
                      bestRating: 5,
                      worstRating: 1,
                    },
                  }
                : {}),
            },
          };
        }),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be injected as raw text; every value here is authored in this repo, none comes from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
