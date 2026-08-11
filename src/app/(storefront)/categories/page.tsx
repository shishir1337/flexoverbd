import { ArrowUpRight, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { categoryIcon, Media } from "@/components/ui/media";
import { compactCount } from "@/lib/utils";
import {
  getAllCategories,
  getSubcategoryCounts,
} from "@/server/services/categories";

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Browse every department at FlexOver BD — fashion, gadgets, home essentials, beauty, fragrances, lifestyle, sports and watches & bags.",
  alternates: { canonical: "/categories" },
};

/**
 * The full department directory — the bottom nav's "Categories" destination.
 *
 * Every subcategory is listed rather than hidden behind a tap, because this
 * page exists to be a complete index: it is the fastest route to a narrow
 * listing for a shopper, and the densest block of internal links on the site
 * for a crawler.
 */
export default async function CategoriesPage() {
  const [categories, subcategoryCounts] = await Promise.all([
    getAllCategories(),
    getSubcategoryCounts(),
  ]);

  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "All categories" }]}
      />

      <header className="mb-6">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-on uppercase">
          <LayoutGrid aria-hidden className="size-4" />
          Browse the store
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          All categories
        </h1>
        <p className="mt-1 text-sm text-ink-2 sm:text-base">
          Eight departments,{" "}
          {categories.reduce((n, c) => n + c.subcategories.length, 0)} sections
          — everything we sell, one tap away.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <section
            key={category.slug}
            aria-labelledby={`cat-${category.slug}`}
            className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
          >
            <Link
              href={`/category/${category.slug}`}
              className="group flex items-center gap-3 p-3 tap"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                <Media
                  asset={category.image}
                  sizes="56px"
                  icon={categoryIcon(category.slug)}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  id={`cat-${category.slug}`}
                  className="block text-base font-bold text-ink group-hover:text-brand-on"
                >
                  {category.name}
                </span>
                <span className="block text-xs text-ink-3">
                  {compactCount(category.itemCount)}+ items
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 text-ink-4 transition-colors group-hover:text-brand-600"
              />
            </Link>

            <ul className="border-t border-line">
              {category.subcategories.map((sub) => (
                <li key={sub.slug}>
                  <Link
                    href={`/category/${category.slug}/${sub.slug}`}
                    className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm text-ink-2 tap transition-colors last:border-b-0 hover:bg-surface-2 hover:text-brand-on"
                  >
                    <span className="clamp-1">{sub.name}</span>
                    <span className="shrink-0 text-xs text-ink-3 tnum">
                      {subcategoryCounts.get(`${category.slug}/${sub.slug}`) ??
                        0}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
