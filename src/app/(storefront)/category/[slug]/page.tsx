import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import {
  ListingSection,
  ListingSkeleton,
} from "@/components/listing/listing-section";
import { ListingJsonLd } from "@/components/seo/listing-json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { categoryIcon, Media } from "@/components/ui/media";
import { PLACEHOLDER_SLUG, withPlaceholder } from "@/lib/static-params";
import { compactCount } from "@/lib/utils";
import { getProductsByCategory } from "@/server/services/catalog";
import {
  getCategory,
  getCategorySlugs,
  getSubcategoryCounts,
} from "@/server/services/categories";
import { findRenamedSlug } from "@/server/services/slug-history";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return withPlaceholder(
    slugs.map((slug) => ({ slug })),
    { slug: PLACEHOLDER_SLUG },
  );
}

export async function generateMetadata(
  props: PageProps<"/category/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} — Buy online in Bangladesh`,
    description: `${category.blurb}. Shop ${category.name.toLowerCase()} at FlexOver BD with cash on delivery and fast delivery across all 64 districts.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage(
  props: PageProps<"/category/[slug]">,
) {
  const { slug } = await props.params;

  const category = await getCategory(slug);
  if (!category) {
    const renamed = await findRenamedSlug("category", slug);
    if (renamed) permanentRedirect(`/category/${renamed}`);
    notFound();
  }

  const [inCategory, subcategoryCounts] = await Promise.all([
    getProductsByCategory(category.slug),
    getSubcategoryCounts(),
  ]);

  return (
    <div className="container-page py-3 pb-14">
      <ListingJsonLd
        name={category.name}
        description={category.blurb}
        path={`/category/${category.slug}`}
        products={inCategory.slice(0, 24)}
      />

      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: category.name }]}
      />

      {/* Category hero: the image gives the page a face, and the subcategory
          chips are the fastest route to a narrower, higher-intent listing. */}
      <div className="mb-6 overflow-hidden rounded-card border border-line bg-linear-to-br from-brand-soft to-surface">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-card bg-surface ring-1 ring-line sm:size-24">
            <Media
              asset={category.image}
              sizes="96px"
              priority
              icon={categoryIcon(category.slug)}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              {category.name}
            </h1>
            <p className="mt-1 text-sm text-ink-2 sm:text-base">
              {category.blurb} · {compactCount(category.itemCount)}+ items
            </p>
          </div>
        </div>

        <nav
          aria-label={`${category.name} subcategories`}
          className="px-5 pb-5 sm:px-6"
        >
          <ul className="flex flex-wrap gap-2">
            {category.subcategories.map((sub) => (
              <li key={sub.slug}>
                <Link
                  href={`/category/${category.slug}/${sub.slug}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-chip border border-line bg-surface px-3 text-sm text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-on"
                >
                  {sub.name}
                  <span className="text-xs text-ink-3 tnum">
                    {subcategoryCounts.get(`${category.slug}/${sub.slug}`) ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Suspense fallback={<ListingSkeleton />}>
        <ListingSection
          searchParams={props.searchParams}
          pathname={`/category/${category.slug}`}
          products={inCategory}
          emptyMessage={`No ${category.name.toLowerCase()} match these filters. Try widening the price range.`}
        />
      </Suspense>
    </div>
  );
}
