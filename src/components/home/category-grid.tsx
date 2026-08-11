import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { categoryIcon, Media } from "@/components/ui/media";
import { SectionHeader } from "@/components/ui/primitives";
import { compactCount } from "@/lib/utils";
import { getAllCategories } from "@/server/services/categories";

export async function CategoryGrid() {
  const categories = await getAllCategories();

  return (
    <section aria-labelledby="categories-heading" className="container-page">
      <SectionHeader
        eyebrow="Browse the store"
        title="Shop by category"
        subtitle="Eight departments, every one a tap away."
      />
      <span id="categories-heading" className="sr-only">
        Shop by category
      </span>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((c) => (
          // Not a single card-wide link: the subcategories below are links
          // too, and nesting an anchor inside an anchor is invalid HTML that
          // browsers silently un-nest, breaking both. The image and title are
          // one link, each subcategory is its own.
          <li
            key={c.slug}
            className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-200 hover:shadow-card-hover"
          >
            <Link href={`/category/${c.slug}`} className="block tap">
              <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
                <Media
                  asset={c.image}
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
                  icon={categoryIcon(c.slug)}
                  className="transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-105"
                />
                <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface/85 text-ink backdrop-blur-sm transition-colors duration-200 group-hover:bg-brand-500 group-hover:text-white">
                  <ArrowUpRight aria-hidden className="size-4" />
                </span>
              </div>

              <div className="px-3 pt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-brand-on sm:text-base">
                  {c.name}
                </h3>
                <p className="mt-0.5 text-2xs font-semibold tracking-wide text-brand-on uppercase">
                  {compactCount(c.itemCount)}+ items
                </p>
              </div>
            </Link>

            {/* Subcategories are the real value of this tile — they turn one
                destination into five, which is both a shorter path to a
                product and more internal links for search engines. */}
            <ul className="mt-2 flex flex-1 flex-wrap content-start gap-1 px-3 pb-3">
              {c.subcategories.map((sub) => (
                <li key={sub.slug}>
                  <Link
                    href={`/category/${c.slug}/${sub.slug}`}
                    className="inline-flex rounded-chip bg-surface-2 px-2 py-1 text-[11px] leading-tight font-medium text-ink-2 tap transition-colors hover:bg-brand-soft hover:text-brand-on"
                  >
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
