import { productDescription } from "@/data";
import type { Product } from "@/data/types";
import { resolvePublicImage } from "@/lib/public-files";
import { getCategory } from "@/server/services/categories";
import { getProductReviewSummary } from "@/server/services/reviews";
import {
  getCommerceSettings,
  getSiteSettings,
  getZonePair,
} from "@/server/services/settings";

/**
 * Product + BreadcrumbList structured data.
 *
 * This is what earns the price, rating and stock status in a Google result,
 * which matters more than usual here: most traffic arrives from search or a
 * shared link, and a rich result is the difference between a tap and a scroll.
 */
export async function ProductJsonLd({ product }: { product: Product }) {
  const [category, site, commerce, zones, reviews] = await Promise.all([
    getCategory(product.category),
    getSiteSettings(),
    getCommerceSettings(),
    getZonePair(),
    getProductReviewSummary(product.id),
  ]);
  const price = product.flash?.price ?? product.price;
  const image = resolvePublicImage(product.image.src);
  const url = `${site.url}/product/${product.slug}`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.title,
        description: productDescription(product),
        sku: product.id.toUpperCase(),
        brand: { "@type": "Brand", name: product.brand },
        category: category?.name,
        ...(image ? { image: [`${site.url}${image}`] } : {}),
        /**
         * Only emitted when real approved reviews exist.
         *
         * This used to publish `product.rating` — a seeded column — alongside
         * four generated reviews attributed to invented people. That is
         * fabricated structured data: it is a false claim to shoppers reading
         * stars in a search result, and it is exactly what Google's review
         * snippet policy treats as spam. No reviews now means no rating markup,
         * which costs a rich result and keeps the page honest.
         */
        ...(reviews.total > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: reviews.average,
                reviewCount: reviews.total,
                bestRating: 5,
                worstRating: 1,
              },
              review: reviews.reviews.slice(0, 10).map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.authorName },
                datePublished: r.createdAt.slice(0, 10),
                reviewRating: {
                  "@type": "Rating",
                  ratingValue: r.rating,
                  bestRating: 5,
                },
                reviewBody: r.body,
              })),
            }
          : {}),
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: site.currency,
          price,
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${site.url}#organization` },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "BD",
            returnPolicyCategory:
              "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: commerce.returnWindowDays,
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: product.freeDelivery ? 0 : zones.inside.fee,
              currency: site.currency,
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "BD",
            },
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Home", item: site.url },
          ...(category
            ? [
                {
                  name: category.name,
                  item: `${site.url}/category/${category.slug}`,
                },
              ]
            : []),
          { name: product.title, item: url },
        ].map((entry, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: entry.name,
          item: entry.item,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be injected as raw text; every value is authored in this repo, none comes from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
