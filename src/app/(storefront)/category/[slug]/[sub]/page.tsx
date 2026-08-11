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
import { PLACEHOLDER_SLUG, withPlaceholder } from "@/lib/static-params";
import { cn } from "@/lib/utils";
import { getProductsBySubcategory } from "@/server/services/catalog";
import {
  getCategory,
  getSubcategory,
  getSubcategoryParams,
} from "@/server/services/categories";
import { findRenamedSlug } from "@/server/services/slug-history";

export async function generateStaticParams() {
  return withPlaceholder(await getSubcategoryParams(), {
    slug: PLACEHOLDER_SLUG,
    sub: PLACEHOLDER_SLUG,
  });
}

/** Both halves must exist and be live, or the URL is a 404 rather than a
 *  category page with an empty grid. */
async function resolve(slug: string, sub: string) {
  const [category, subcategory] = await Promise.all([
    getCategory(slug),
    getSubcategory(slug, sub),
  ]);
  return category && subcategory ? { category, subcategory } : null;
}

export async function generateMetadata(
  props: PageProps<"/category/[slug]/[sub]">,
): Promise<Metadata> {
  const { slug, sub } = await props.params;
  const found = await resolve(slug, sub);
  if (!found) return { title: "Not found" };

  return {
    title: `${found.subcategory.name} — ${found.category.name}`,
    description: `Buy ${found.subcategory.name.toLowerCase()} online in Bangladesh. Cash on delivery, fast delivery in all 64 districts, 7-day easy return.`,
    alternates: { canonical: `/category/${slug}/${sub}` },
  };
}

export default async function SubcategoryPage(
  props: PageProps<"/category/[slug]/[sub]">,
) {
  const { slug, sub } = await props.params;

  const found = await resolve(slug, sub);
  if (!found) {
    // Only the category half is tracked — subcategory slugs are unique per
    // category, so they have no global key to record a rename under.
    const renamed = await findRenamedSlug("category", slug);
    if (renamed) permanentRedirect(`/category/${renamed}/${sub}`);
    notFound();
  }
  const { category, subcategory } = found;

  const matching = await getProductsBySubcategory(slug, sub);

  return (
    <div className="container-page py-3 pb-14">
      <ListingJsonLd
        name={`${subcategory.name} — ${category.name}`}
        description={`Shop ${subcategory.name.toLowerCase()} at FlexOver BD with cash on delivery across Bangladesh.`}
        path={`/category/${category.slug}/${subcategory.slug}`}
        products={matching.slice(0, 24)}
        trail={[{ name: category.name, path: `/category/${category.slug}` }]}
      />

      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Home", href: "/" },
          { label: category.name, href: `/category/${category.slug}` },
          { label: subcategory.name },
        ]}
      />

      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
        {subcategory.name}
      </h1>
      <p className="mt-1 text-sm text-ink-2">
        in{" "}
        <Link
          href={`/category/${category.slug}`}
          className="font-semibold text-brand-on hover:underline"
        >
          {category.name}
        </Link>
      </p>

      {/* Sibling subcategories keep lateral movement one tap away instead of
          forcing a trip back up to the category. */}
      <nav aria-label="Related subcategories" className="mt-4 mb-6">
        <ul className="flex flex-wrap gap-2">
          {category.subcategories.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/category/${category.slug}/${s.slug}`}
                aria-current={s.slug === subcategory.slug ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-chip border px-3 text-sm tap transition-colors",
                  s.slug === subcategory.slug
                    ? "border-brand-500 bg-brand-soft font-semibold text-brand-on"
                    : "border-line bg-surface text-ink-2 hover:border-brand-500 hover:text-brand-on",
                )}
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Suspense fallback={<ListingSkeleton />}>
        <ListingSection
          searchParams={props.searchParams}
          pathname={`/category/${category.slug}/${subcategory.slug}`}
          products={matching}
          emptyMessage={`No ${subcategory.name.toLowerCase()} match these filters right now.`}
        />
      </Suspense>
    </div>
  );
}
