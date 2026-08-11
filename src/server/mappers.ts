import "server-only";
import type {
  Category,
  CategorySlug,
  ColorOption,
  ImageAsset,
  Product,
  SizeGroup,
  SizeOption,
  SizeSystem,
} from "@/data/types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Database rows → the types the storefront already renders.
 *
 * The whole point: components keep consuming `Product`, `ImageAsset` and the
 * rest exactly as they do today, so switching a page from `@/data` to a service
 * call is a one-line import change rather than a rewrite. When these mappers
 * are gone the migration is finished; until then they are the seam.
 */

/**
 * The catalogue include, built against a caller-supplied clock.
 *
 * This used to be a plain `const`, and its flash-sale window called
 * `new Date()` inside the object literal. Object literals are evaluated once,
 * at module import — so the "now" every flash sale was compared against was
 * frozen at server boot. On a long-running process that meant a sale starting
 * after boot never appeared, and a sale that had ended kept selling at the
 * discount until someone restarted the server.
 *
 * `nowMs` is required rather than defaulted on purpose. Every caller sits
 * inside a `"use cache"` scope, where reading the clock directly is the whole
 * problem; passing it in forces each one through `getApproximateNow()`, which
 * is cached and bucketed to the minute so the value is stable within a render
 * and still moves with real time.
 */
export function productInclude(nowMs: number) {
  const now = new Date(nowMs);
  return {
    brand: true,
    category: true,
    subcategory: true,
    images: { orderBy: { position: "asc" }, include: { media: true } },
    variants: { where: { isActive: true }, orderBy: { position: "asc" } },
    flashItems: {
      where: {
        campaign: {
          isActive: true,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      },
      take: 1,
    },
  } satisfies Prisma.ProductInclude;
}

export type ProductRow = Prisma.ProductGetPayload<{
  include: ReturnType<typeof productInclude>;
}>;

const BADGE_TO_UI = {
  NEW: "new",
  BESTSELLER: "bestseller",
  LIMITED: "limited",
  RESTOCK: "restock",
} as const;

const SIZE_SYSTEM_TO_UI: Record<string, SizeSystem> = {
  APPAREL: "apparel",
  FOOTWEAR: "footwear",
  ONESIZE: "onesize",
};

function toImageAsset(
  media: {
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
  },
  fallbackAlt: string,
): ImageAsset {
  return {
    src: media.url,
    alt: media.alt || fallbackAlt,
    width: media.width ?? 800,
    height: media.height ?? 800,
    // Prompts only matter to the artwork pipeline, which reads the source data
    // files directly — nothing renders this.
    prompt: "",
  };
}

/**
 * Collapses the variant rows back into the colour/size shape the pickers use.
 *
 * A colour is in stock if *any* variant carrying it has units, which is what
 * the swatch means to a shopper — "this colour is available in some size".
 */
function toColors(variants: ProductRow["variants"]): ColorOption[] | undefined {
  const byName = new Map<string, ColorOption>();

  for (const v of variants) {
    if (!v.colourName) continue;
    const existing = byName.get(v.colourName);
    const hasStock = v.stock > 0;

    if (existing) {
      if (hasStock) existing.inStock = true;
    } else {
      byName.set(v.colourName, {
        name: v.colourName,
        hex: v.colourHex ?? "#cccccc",
        inStock: hasStock,
      });
    }
  }

  return byName.size ? [...byName.values()] : undefined;
}

function toSizes(variants: ProductRow["variants"]): SizeGroup | undefined {
  const byValue = new Map<string, SizeOption>();
  let system: SizeSystem | undefined;

  for (const v of variants) {
    if (!v.sizeValue) continue;
    if (!system && v.sizeSystem) system = SIZE_SYSTEM_TO_UI[v.sizeSystem];

    const existing = byValue.get(v.sizeValue);
    const hasStock = v.stock > 0;

    if (existing) {
      if (hasStock) existing.inStock = true;
    } else {
      byValue.set(v.sizeValue, {
        value: v.sizeValue,
        label: v.sizeLabel ?? v.sizeValue,
        inStock: hasStock,
      });
    }
  }

  if (!byValue.size) return undefined;
  return { system: system ?? "apparel", options: [...byValue.values()] };
}

export function toProduct(row: ProductRow): Product {
  const primary = row.images[0];
  const flash = row.flashItems[0];

  // Stock is per-variant in the database; the card and PDP still want one
  // headline number ("Only 6 left"), which is the sum across combinations.
  const stock = row.variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand?.name ?? "",
    category: row.category.slug as CategorySlug,
    subcategory: row.subcategory?.name ?? "",
    description: row.description ?? undefined,
    price: row.price,
    compareAt: row.compareAt ?? undefined,
    rating: Number(row.ratingAvg),
    reviewCount: row.reviewCount,
    sold: row.soldCount,
    stock,
    badge: row.badge ? BADGE_TO_UI[row.badge] : undefined,
    colors: toColors(row.variants),
    sizes: toSizes(row.variants),
    freeDelivery: row.freeDelivery,
    flash: flash
      ? {
          price: flash.salePrice,
          claimedPercent: flash.stockCap
            ? Math.min(100, Math.round((flash.claimed / flash.stockCap) * 100))
            : flash.claimed,
        }
      : undefined,
    image: primary
      ? toImageAsset(primary.media, row.title)
      : { src: "", alt: row.title, width: 800, height: 800, prompt: "" },
    tags: row.tags,
  };
}

/** Gallery images, in position order — replaces the on-disk `-2`/`-3` convention. */
export function toGallery(row: ProductRow): ImageAsset[] {
  return row.images.map((i) => toImageAsset(i.media, row.title));
}

export const categoryInclude = {
  image: true,
  subcategories: {
    where: { isActive: true, archivedAt: null },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.CategoryInclude;

export type CategoryRow = Prisma.CategoryGetPayload<{
  include: typeof categoryInclude;
}>;

/**
 * Category row → the `Category` shape the pages already render.
 *
 * `itemCount` is passed in rather than read off the row: it is a live count of
 * published products, and making it part of the include would force every
 * category query to aggregate whether it needed the number or not.
 */
export function toCategory(row: CategoryRow, itemCount = 0): Category {
  return {
    slug: row.slug as CategorySlug,
    name: row.name,
    shortName: row.shortName,
    blurb: row.blurb,
    itemCount,
    tint: row.tint,
    image: row.image
      ? toImageAsset(row.image, row.name)
      : { src: "", alt: row.name, width: 800, height: 800, prompt: "" },
    subcategories: row.subcategories.map((s) => ({
      slug: s.slug,
      name: s.name,
    })),
  };
}
