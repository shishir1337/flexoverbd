import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Admin reads for categories, subcategories and brands.
 *
 * Deliberately uncached, unlike the storefront's equivalents in
 * `@/server/services/categories`. An admin editing the taxonomy needs to see
 * the row they just saved, and archived rows the storefront must never show.
 */

export type AdminCategoryRow = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  position: number;
  isActive: boolean;
  isArchived: boolean;
  subcategoryCount: number;
  productCount: number;
};

export async function listCategories(): Promise<AdminCategoryRow[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ archivedAt: "asc" }, { position: "asc" }],
    include: {
      _count: {
        select: {
          subcategories: { where: { archivedAt: null } },
          products: { where: { archivedAt: null } },
        },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    position: c.position,
    isActive: c.isActive,
    isArchived: c.archivedAt !== null,
    subcategoryCount: c._count.subcategories,
    productCount: c._count.products,
  }));
}

export type AdminCategoryDetail = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  blurb: string;
  tint: string;
  position: number;
  isActive: boolean;
  isArchived: boolean;
  seoTitle: string;
  seoDescription: string;
  productCount: number;
  subcategories: {
    id: string;
    slug: string;
    name: string;
    position: number;
    isActive: boolean;
    isArchived: boolean;
    productCount: number;
  }[];
};

export async function getCategoryDetail(
  id: string,
): Promise<AdminCategoryDetail | null> {
  const c = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: { where: { archivedAt: null } } } },
      subcategories: {
        orderBy: [{ archivedAt: "asc" }, { position: "asc" }],
        include: {
          _count: { select: { products: { where: { archivedAt: null } } } },
        },
      },
    },
  });
  if (!c) return null;

  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    blurb: c.blurb,
    tint: c.tint,
    position: c.position,
    isActive: c.isActive,
    isArchived: c.archivedAt !== null,
    seoTitle: c.seoTitle ?? "",
    seoDescription: c.seoDescription ?? "",
    productCount: c._count.products,
    subcategories: c.subcategories.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      position: s.position,
      isActive: s.isActive,
      isArchived: s.archivedAt !== null,
      productCount: s._count.products,
    })),
  };
}

export type AdminBrandRow = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
};

export async function listBrands(): Promise<AdminBrandRow[]> {
  const rows = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: { archivedAt: null } } } },
    },
  });

  return rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    productCount: b._count.products,
  }));
}
