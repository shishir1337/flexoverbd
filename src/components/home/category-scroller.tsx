import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { categoryIcon, Media } from "@/components/ui/media";
import { Rail } from "@/components/ui/primitives";
import { getAllCategories } from "@/server/services/categories";

/**
 * Sits directly under the hero. On a catalogue this broad, letting people
 * self-select a department in one tap is the fastest route out of the
 * homepage and into a buying journey.
 */
export async function CategoryScroller() {
  const categories = await getAllCategories();

  return (
    <nav aria-label="Shop by category" className="container-page">
      <Rail label="categories" align="center" className="gap-4 sm:gap-5">
        {categories.map((c) => {
          const Icon = categoryIcon(c.slug);
          return (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rail-item group flex w-16 flex-col items-center gap-1.5 tap sm:w-20"
            >
              <span className="relative size-16 overflow-hidden rounded-full border border-line bg-surface-2 transition-[border-color,transform] duration-200 ease-(--ease-out-soft) group-hover:border-brand-500 group-active:scale-95 sm:size-20">
                <Media
                  asset={c.image}
                  sizes="80px"
                  icon={Icon}
                  className="transition-transform duration-500 group-hover:scale-110"
                />
              </span>
              <span className="text-center text-[11px] leading-tight font-semibold text-ink-2 group-hover:text-brand-on sm:text-xs">
                {c.shortName}
              </span>
            </Link>
          );
        })}

        <Link
          href="/categories"
          className="rail-item group flex w-16 flex-col items-center gap-1.5 tap sm:w-20"
        >
          <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand-600 transition-colors duration-200 group-hover:bg-brand-100 sm:size-20">
            <LayoutGrid aria-hidden className="size-6" strokeWidth={1.8} />
          </span>
          <span className="text-center text-[11px] leading-tight font-semibold text-ink-2 group-hover:text-brand-on sm:text-xs">
            All
          </span>
        </Link>
      </Rail>
    </nav>
  );
}
