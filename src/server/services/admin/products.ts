import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Admin catalogue reads.
 *
 * Uncached, unlike the storefront's: an admin editing a price needs to see what
 * is actually stored, not a cached copy of what it was an hour ago.
 *
 * These deliberately include archived and unpublished rows — the whole point of
 * the admin is to work on things the storefront cannot see.
 */

const PAGE_SIZE = 25;

export type ProductSort = "recent" | "title" | "stock-low" | "price-high";

/** Sort keys the list offers, and what they mean to Prisma. */
const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  recent: { updatedAt: "desc" },
  title: { title: "asc" },
  "price-high": { price: "desc" },
};

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  status?: "published" | "draft" | "archived";
  sort?: ProductSort;
  page?: number;
};

export async function listProducts(filters: ProductFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.ProductWhereInput = {};

  // Both the search and the draft filter are OR-groups. Assigning each to
  // `where.OR` in turn meant the second silently replaced the first, so
  // searching within Drafts quietly returned every draft. AND-ing the groups
  // keeps both conditions.
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;

  if (filters.status === "archived") where.archivedAt = { not: null };
  else {
    where.archivedAt = null;
    if (filters.status === "published") {
      where.isActive = true;
      where.publishedAt = { not: null };
    } else if (filters.status === "draft") {
      and.push({ OR: [{ isActive: false }, { publishedAt: null }] });
    }
  }

  if (and.length > 0) where.AND = and;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: {
          orderBy: { position: "asc" },
          take: 1,
          include: { media: { select: { url: true } } },
        },
        variants: { select: { stock: true, isActive: true } },
        _count: { select: { images: true } },
      },
      orderBy: ORDER_BY[filters.sort ?? "recent"] ?? ORDER_BY.recent,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const rows = products.map((p) => ({
    ...p,
    // The list shows one stock figure; per-variant detail is on the edit page.
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    variantCount: p.variants.length,
  }));

  // Total stock is summed in memory, so the database cannot order by it. Sorting
  // the page rather than the table is a real limitation — it surfaces the
  // emptiest rows *on this page*, not in the catalogue. Kept because the
  // alternative is a raw aggregate query for a convenience, and the low-stock
  // count on the dashboard is the honest answer to "what is running out".
  if (filters.sort === "stock-low") {
    rows.sort((a, b) => a.totalStock - b.totalStock);
  }

  return {
    products: rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: true,
      subcategory: true,
      variants: { orderBy: { position: "asc" } },
      images: {
        orderBy: { position: "asc" },
        include: { media: true },
      },
    },
  });
}

export type AdminProduct = NonNullable<
  Awaited<ReturnType<typeof getAdminProduct>>
>;

/** Category + subcategory options for the product form's selects. */
export async function getCategoryOptions() {
  return prisma.category.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      subcategories: {
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });
}

export async function getBrandOptions() {
  return prisma.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
