import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import type { Category } from "@/data/types";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";
import { categoryInclude, toCategory } from "@/server/mappers";

/**
 * Category reads.
 *
 * Split from catalog.ts because these are navigation data — read on nearly
 * every page, changed rarely, and cached for days rather than hours.
 */

const LIVE_PRODUCT = {
  isActive: true,
  archivedAt: null,
  publishedAt: { not: null },
} as const;

export async function getAllCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(tags.categories, tags.products);
  cacheLife("hours");

  const rows = await prisma.category.findMany({
    where: { isActive: true, archivedAt: null },
    include: {
      ...categoryInclude,
      _count: { select: { products: { where: LIVE_PRODUCT } } },
    },
    orderBy: { position: "asc" },
  });

  return rows.map((row) => toCategory(row, row._count.products));
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache";
  cacheTag(tags.category(slug), tags.products);
  cacheLife("hours");

  const row = await prisma.category.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    include: {
      ...categoryInclude,
      _count: { select: { products: { where: LIVE_PRODUCT } } },
    },
  });

  return row ? toCategory(row, row._count.products) : null;
}

export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("days");

  const rows = await prisma.category.findMany({
    where: { isActive: true, archivedAt: null },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Every category/subcategory pair, for `generateStaticParams` on the sub route. */
export async function getSubcategoryParams(): Promise<
  { slug: string; sub: string }[]
> {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("days");

  const rows = await prisma.subcategory.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      category: { isActive: true, archivedAt: null },
    },
    select: { slug: true, category: { select: { slug: true } } },
  });
  return rows.map((r) => ({ slug: r.category.slug, sub: r.slug }));
}

/**
 * Product counts per subcategory, keyed `"category-slug/sub-slug"` — the same
 * key the chips already look up, so the page keeps its `.get()` call.
 *
 * One grouped query rather than one per chip.
 */
export async function getSubcategoryCounts(): Promise<Map<string, number>> {
  "use cache";
  cacheTag(tags.categories, tags.products);
  cacheLife("hours");

  const rows = await prisma.subcategory.findMany({
    where: { isActive: true, archivedAt: null },
    select: {
      slug: true,
      category: { select: { slug: true } },
      _count: { select: { products: { where: LIVE_PRODUCT } } },
    },
  });

  return new Map(
    rows.map((r) => [`${r.category.slug}/${r.slug}`, r._count.products]),
  );
}

export async function getSubcategory(
  categorySlug: string,
  subSlug: string,
): Promise<{ slug: string; name: string } | null> {
  "use cache";
  cacheTag(tags.category(categorySlug));
  cacheLife("days");

  const row = await prisma.subcategory.findFirst({
    where: {
      slug: subSlug,
      isActive: true,
      archivedAt: null,
      category: { slug: categorySlug },
    },
    select: { slug: true, name: true },
  });
  return row;
}
