import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import type { ImageAsset, Product } from "@/data/types";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";
import { getApproximateNow } from "@/server/clock";
import { productInclude, toGallery, toProduct } from "@/server/mappers";

/**
 * Catalogue reads.
 *
 * Pages call these; pages never import Prisma. That keeps caching,
 * authorization and query shape in one place — and it is what lets a query gain
 * an index or a cache tag without touching a single component.
 *
 * Every function here is cached and tagged. Admin mutations invalidate the
 * matching tag from `@/server/cache-tags`, so a price edit reaches the
 * storefront without a deploy and without a blanket purge.
 */

/** Only published, unarchived rows are ever visible to shoppers. */
const LIVE = {
  isActive: true,
  archivedAt: null,
  publishedAt: { not: null },
} as const;

/**
 * Products that could possibly be on offer.
 *
 * The *ranking* genuinely cannot move to SQL: the discount percent is derived
 * from the effective price — which a live flash sale overrides — against
 * `compareAt`, and neither the effective price nor the percent is a stored
 * column. So the sort stays in memory.
 *
 * What can move is the *narrowing*. Only two kinds of product can be
 * discounted at all: one carrying a `compareAt` above its price, or one in a
 * running flash campaign. `/offers` used to load the entire catalogue and
 * throw away everything else; this asks for the candidates and nothing more.
 */
export async function getDiscountedProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const nowMs = await getApproximateNow();
  const now = new Date(nowMs);

  const rows = await prisma.product.findMany({
    where: {
      ...LIVE,
      OR: [
        // A struck-through price higher than what is charged.
        { compareAt: { not: null, gt: prisma.product.fields.price } },
        // Or a flash campaign running right now.
        {
          flashItems: {
            some: {
              campaign: {
                isActive: true,
                startsAt: { lte: now },
                endsAt: { gte: now },
              },
            },
          },
        },
      ],
    },
    include: productInclude(nowMs),
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toProduct);
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: LIVE,
    include: productInclude(await getApproximateNow()),
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toProduct);
}

/**
 * Everything the product page needs, from one read.
 *
 * There used to be a separate `getProductGallery` alongside a
 * `getProductBySlug`,
 * commented as keeping listings from paying for extra images — but both issued
 * the byte-identical query, same `where`, same include. It saved listings
 * nothing and cost every product page a second round trip on a cold cache,
 * on the highest-traffic page type in the shop.
 *
 * Returning both from one row is the fix. The gallery is still a distinct
 * shape for the caller; it just no longer costs a second query to get it.
 */
export async function getProductPage(
  slug: string,
): Promise<{ product: Product; gallery: ImageAsset[] } | null> {
  "use cache";
  cacheTag(tags.product(slug), tags.products);
  cacheLife("hours");

  const row = await prisma.product.findFirst({
    where: { slug, ...LIVE },
    include: productInclude(await getApproximateNow()),
  });
  if (!row) return null;

  return { product: toProduct(row), gallery: toGallery(row) };
}

/**
 * `limit` is optional because two callers want different things: the category
 * page needs every product to filter over, while a homepage rail wants the top
 * handful. Passing it through to SQL keeps the rail from loading a department.
 */
export async function getProductsByCategory(
  categorySlug: string,
  limit?: number,
): Promise<Product[]> {
  "use cache";
  cacheTag(tags.category(categorySlug), tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: { ...LIVE, category: { slug: categorySlug } },
    include: productInclude(await getApproximateNow()),
    orderBy: { soldCount: "desc" },
    ...(limit ? { take: limit } : {}),
  });
  return rows.map(toProduct);
}

export async function getProductsBySubcategory(
  categorySlug: string,
  subSlug: string,
): Promise<Product[]> {
  "use cache";
  cacheTag(tags.category(categorySlug), tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: {
      ...LIVE,
      category: { slug: categorySlug },
      subcategory: { slug: subSlug },
    },
    include: productInclude(await getApproximateNow()),
    orderBy: { soldCount: "desc" },
  });
  return rows.map(toProduct);
}

export async function getCategories() {
  "use cache";
  cacheTag(tags.categories);
  cacheLife("days");

  return prisma.category.findMany({
    where: { isActive: true, archivedAt: null },
    include: {
      image: true,
      subcategories: {
        where: { isActive: true, archivedAt: null },
        orderBy: { position: "asc" },
      },
      _count: { select: { products: { where: LIVE } } },
    },
    orderBy: { position: "asc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheTag(tags.category(slug));
  cacheLife("days");

  return prisma.category.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    include: {
      image: true,
      subcategories: {
        where: { isActive: true, archivedAt: null },
        orderBy: { position: "asc" },
      },
    },
  });
}

/**
 * Slugs for `generateStaticParams`. Deliberately a bare column select — the
 * build calls this before anything is warm, and pulling full rows here would
 * fetch the whole catalogue twice.
 */
export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: LIVE,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getFlashSaleProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(tags.flashSale, tags.products);
  // Minutes, not hours: a flash sale that keeps selling after it ends is worse
  // than a slightly warm cache.
  cacheLife("minutes");

  const now = new Date();
  const rows = await prisma.product.findMany({
    where: {
      ...LIVE,
      flashItems: {
        some: {
          campaign: {
            isActive: true,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
      },
    },
    include: productInclude(await getApproximateNow()),
  });
  return rows.map(toProduct);
}

export async function getBestSellers(limit = 10): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: LIVE,
    include: productInclude(await getApproximateNow()),
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  return rows.map(toProduct);
}

export async function getNewArrivals(limit = 10): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: LIVE,
    include: productInclude(await getApproximateNow()),
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map(toProduct);
}

export async function getTopRated(limit = 10): Promise<Product[]> {
  "use cache";
  cacheTag(tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: { ...LIVE, ratingAvg: { gte: 4.5 } },
    include: productInclude(await getApproximateNow()),
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
    take: limit,
  });
  return rows.map(toProduct);
}

/**
 * "More in this category" rail on the detail page. Ordered by sales so the rail
 * leads with what actually converts, and excludes the product being viewed.
 */
export async function getRelatedProducts(
  categorySlug: string,
  excludeSlug: string,
  limit = 10,
): Promise<Product[]> {
  "use cache";
  cacheTag(tags.category(categorySlug), tags.products);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: {
      ...LIVE,
      category: { slug: categorySlug },
      slug: { not: excludeSlug },
    },
    include: productInclude(await getApproximateNow()),
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  return rows.map(toProduct);
}

/**
 * The subcategory a product belongs to, as the breadcrumb needs it. Returned
 * from the product's own row rather than a second query.
 */
export async function getSubcategoryOf(
  slug: string,
): Promise<{ slug: string; name: string } | null> {
  "use cache";
  cacheTag(tags.product(slug));
  cacheLife("hours");

  const row = await prisma.product.findFirst({
    where: { slug, ...LIVE },
    select: { subcategory: { select: { slug: true, name: true } } },
  });
  return row?.subcategory ?? null;
}
