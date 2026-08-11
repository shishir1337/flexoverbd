import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductListing } from "@/components/listing/product-listing";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonStyles } from "@/components/ui/button";
import type { ListingSearchParams } from "@/lib/listing";
import { searchProducts, suggestTerms } from "@/lib/search";
import { getProducts } from "@/server/services/catalog";
import { getAllCategories } from "@/server/services/categories";
import { getTrendingSearches } from "@/server/services/settings";
import { recordSearch } from "@/server/services/trending";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the FlexOver BD catalogue.",
  // Search result pages carry no unique value for an index and would burn
  // crawl budget on infinite query permutations.
  robots: { index: false, follow: true },
};

export default async function SearchPage(props: PageProps<"/search">) {
  const raw = await props.searchParams;
  const params = raw as ListingSearchParams;
  const query = (typeof raw.q === "string" ? raw.q : "").trim();

  // The whole catalogue is loaded and searched in memory. That is fine at this
  // size and keeps the weighted/synonym ranking in `searchProducts` intact;
  // past a few thousand products this moves to Postgres full-text search.
  const [products, categories, trendingSearches] = await Promise.all([
    getProducts(),
    getAllCategories(),
    getTrendingSearches(),
  ]);

  const results = query ? searchProducts(products, query) : [];

  // Count the search so the trending list reflects what shoppers actually
  // type. Only searches that found something are recorded — a typo returning
  // nothing is not a trend, and suggesting it would walk the next shopper into
  // the same dead end. Fire-and-forget: analytics must never delay the page or
  // fail it.
  if (query) void recordSearch(query, results.length);
  const pathname = query ? `/search?q=${encodeURIComponent(query)}` : "/search";

  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Search" }]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          {query ? (
            <>
              Results for <span className="text-brand-on">“{query}”</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        {query && (
          <p className="mt-1 text-sm text-ink-2">
            {results.length === 0
              ? "No products matched that search."
              : `${results.length} ${results.length === 1 ? "product" : "products"} found.`}
          </p>
        )}
      </header>

      {!query ? (
        <EmptyState
          title="What are you looking for?"
          body="Use the search box at the top, or start from one of these."
          terms={trendingSearches}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={`Nothing found for “${query}”`}
          body="Check the spelling, try a shorter word, or browse a department instead."
          terms={suggestTerms(products)}
          categories={categories}
        />
      ) : (
        <ProductListing
          pathname={pathname}
          params={params}
          products={results}
          emptyMessage="No results match these filters. Try clearing them."
        />
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  terms,
  categories = [],
}: {
  title: string;
  body: string;
  terms: string[];
  /** Passing these in also doubles as the "show the department list" switch. */
  categories?: { slug: string; name: string }[];
}) {
  const showCategories = categories.length > 0;

  return (
    <div className="rounded-card border border-line bg-surface-2 px-5 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface">
        <SearchX aria-hidden className="size-6 text-ink-4" />
      </span>
      <p className="mt-3 text-base font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{body}</p>

      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {terms.map((term) => (
          <li key={term}>
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              className="inline-flex rounded-chip border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-on"
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>

      {showCategories && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-bold tracking-wide text-ink-3 uppercase">
            Or browse a department
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className={buttonStyles("secondary", "sm")}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
