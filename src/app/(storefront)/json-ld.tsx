import {
  getCommerceSettings,
  getContactSettings,
  getSiteSettings,
  getSocialSettings,
  getStoreStats,
} from "@/server/services/settings";

/**
 * Structured data for the homepage. Kept as one script tag with a graph so
 * Google resolves the Organization ↔ WebSite relationship, and so the search
 * box in the header can qualify for a sitelinks searchbox.
 */
export async function HomeJsonLd() {
  const [storeStats, site, contact, commerce, social] = await Promise.all([
    getStoreStats(),
    getSiteSettings(),
    getContactSettings(),
    getCommerceSettings(),
    getSocialSettings(),
  ]);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": `${site.url}#organization`,
        name: site.name,
        legalName: site.legalName,
        url: site.url,
        logo: `${site.url}/icon.jpg`,
        image: `${site.url}/icon.jpg`,
        description: site.description,
        slogan: site.tagline,
        email: contact.email,
        telephone: contact.whatsapp,
        currenciesAccepted: site.currency,
        paymentAccepted:
          "Cash on Delivery, bKash, Nagad, Rocket, Visa, Mastercard",
        areaServed: { "@type": "Country", name: site.country },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dhaka",
          addressCountry: "BD",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: contact.whatsapp,
          email: contact.email,
          availableLanguage: ["en", "bn"],
        },
        sameAs: [social.facebook, social.instagram].filter(Boolean),
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: storeStats.ratingAverage,
          reviewCount: storeStats.ratingCount,
          bestRating: 5,
          worstRating: 1,
        },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "BD",
          returnPolicyCategory:
            "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: commerce.returnWindowDays,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}#website`,
        url: site.url,
        name: site.name,
        inLanguage: "en-BD",
        publisher: { "@id": `${site.url}#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be injected as raw text. JSON.stringify escapes the values, and they come from admin-authored settings, not from visitors.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
