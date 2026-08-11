"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { productTags } from "@/server/cache-tags";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Variants — the thing a customer actually buys.
 *
 * A product is a description; a variant is a sellable row with a SKU, a stock
 * count and a price. Until this existed the only way to get a product onto the
 * storefront was to write variants into the seed script, which is why every
 * "add a product" attempt ended at a page with nothing to add to the cart.
 *
 * Stock is deliberately NOT editable through create/update after the fact: it
 * moves through `adjustStock`, which writes the ledger. The one exception is
 * the opening count at creation, recorded as a RESTOCK movement so that even a
 * brand-new variant's total reconciles with its history from the first day.
 */

async function touchProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return;

  for (const tag of productTags(product.slug)) revalidateTag(tag, "max");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

/** Trim to null, so an empty box means "not set" rather than "the empty string". */
const optionalText = z
  .string()
  .trim()
  .max(60)
  .transform((v) => v || null)
  .nullish()
  .transform((v) => v ?? null);

const variantFields = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "A SKU is required.")
    .max(64, "Keep the SKU under 64 characters.")
    // Spaces in a SKU survive one careless copy-paste into a courier form and
    // then nobody can find the row again.
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, dashes only."),
  colourName: optionalText,
  colourHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1a2b3c.")
    .nullish()
    .or(z.literal("").transform(() => null))
    .transform((v) => v ?? null),
  sizeValue: optionalText,
  sizeLabel: optionalText,
  sizeSystem: z
    .enum(["APPAREL", "FOOTWEAR", "ONESIZE"])
    .nullish()
    .or(z.literal("").transform(() => null))
    .transform((v) => v ?? null),
  priceOverride: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)])
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null),
  isActive: z.boolean().default(true),
});

const createSchema = variantFields.extend({
  productId: z.string().min(1),
  stock: z.coerce
    .number()
    .int("Enter a whole number of units.")
    .min(0, "Stock cannot be negative.")
    .max(1_000_000)
    .default(0),
});

export type VariantInput = z.input<typeof createSchema>;

/**
 * Two variants of the same product with the same colour and size are the same
 * variant. The database's unique index cannot enforce this on its own, because
 * Postgres treats NULLs as distinct — so a product could otherwise collect
 * three "no colour, no size" rows and the storefront would show three
 * identical options.
 */
async function combinationTaken(
  productId: string,
  colourName: string | null,
  sizeValue: string | null,
  excludeId?: string,
) {
  const clash = await prisma.productVariant.findFirst({
    where: {
      productId,
      colourName,
      sizeValue,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(clash);
}

function describe(v: { colourName: string | null; sizeValue: string | null }) {
  return [v.colourName, v.sizeValue].filter(Boolean).join(" · ") || "Default";
}

export async function createVariant(
  input: VariantInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { productId, stock, ...fields } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  if (await combinationTaken(productId, fields.colourName, fields.sizeValue)) {
    return {
      ok: false,
      error: `${describe(fields)} already exists on this product.`,
    };
  }

  const taken = await prisma.productVariant.findUnique({
    where: { sku: fields.sku },
    select: { productId: true },
  });
  if (taken) {
    return {
      ok: false,
      error:
        taken.productId === productId
          ? "That SKU is already used by another variant of this product."
          : "That SKU belongs to a different product.",
    };
  }

  const last = await prisma.productVariant.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const variant = await prisma.$transaction(async (tx) => {
    const created = await tx.productVariant.create({
      data: {
        ...fields,
        productId,
        stock,
        position: (last?.position ?? -1) + 1,
      },
    });

    // An opening count is still a stock movement. Without this the ledger
    // starts at zero while the variant claims 40 units, and the first
    // reconciliation looks like theft.
    if (stock > 0) {
      await tx.stockMovement.create({
        data: {
          variantId: created.id,
          delta: stock,
          reason: "RESTOCK",
          note: "Opening count",
          createdById: session.user.id,
        },
      });
    }

    return created;
  });

  await recordAudit({
    userId: session.user.id,
    action: "variant.create",
    entity: "ProductVariant",
    entityId: variant.id,
    after: { sku: variant.sku, label: describe(variant), stock },
  });

  await touchProduct(productId);
  return { ok: true, data: { id: variant.id } };
}

const updateSchema = variantFields.extend({
  id: z.string().min(1),
});

export async function updateVariant(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { id, ...fields } = parsed.data;

  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Variant not found." };

  if (
    await combinationTaken(
      existing.productId,
      fields.colourName,
      fields.sizeValue,
      id,
    )
  ) {
    return {
      ok: false,
      error: `${describe(fields)} already exists on this product.`,
    };
  }

  if (fields.sku !== existing.sku) {
    const taken = await prisma.productVariant.findUnique({
      where: { sku: fields.sku },
      select: { id: true },
    });
    if (taken) return { ok: false, error: "That SKU is already in use." };
  }

  await prisma.productVariant.update({ where: { id }, data: fields });

  await recordAudit({
    userId: session.user.id,
    action: "variant.update",
    entity: "ProductVariant",
    entityId: id,
    before: {
      sku: existing.sku,
      label: describe(existing),
      priceOverride: existing.priceOverride,
      isActive: existing.isActive,
    },
    after: {
      sku: fields.sku,
      label: describe(fields),
      priceOverride: fields.priceOverride,
      isActive: fields.isActive,
    },
  });

  await touchProduct(existing.productId);
  return { ok: true };
}

const deleteSchema = z.object({ id: z.string().min(1) });

/**
 * Deleting a variant is only safe while nothing has been sold as it.
 *
 * `OrderItem.variantId` is nullable and would simply be nulled out, leaving the
 * order's own snapshot intact — the customer's receipt would still read
 * correctly. But "which variant was this" stops being answerable, and that is
 * the question every stock reconciliation and return starts with. So a sold
 * variant is deactivated instead: it disappears from the storefront and keeps
 * its history.
 */
export async function deleteVariant(
  input: z.input<typeof deleteSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!variant) return { ok: false, error: "Variant not found." };

  if (variant._count.orderItems > 0) {
    return {
      ok: false,
      error: `This variant appears on ${variant._count.orderItems} order${
        variant._count.orderItems === 1 ? "" : "s"
      }. Turn it off instead so the history stays intact.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    // Cart lines and stock movements cascade. Carts holding this variant lose
    // the line, which is correct: it is no longer buyable.
    await tx.productVariant.delete({ where: { id } });

    const rest = await tx.productVariant.findMany({
      where: { productId: variant.productId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [i, row] of rest.entries()) {
      await tx.productVariant.update({
        where: { id: row.id },
        data: { position: i },
      });
    }
  });

  await recordAudit({
    userId: session.user.id,
    action: "variant.delete",
    entity: "ProductVariant",
    entityId: id,
    before: {
      sku: variant.sku,
      label: describe(variant),
      stock: variant.stock,
    },
  });

  await touchProduct(variant.productId);
  return { ok: true };
}

const reorderSchema = z.object({
  productId: z.string().min(1),
  variantIds: z.array(z.string().min(1)).min(1),
});

export async function reorderVariants(
  input: z.input<typeof reorderSchema>,
): Promise<ActionResult> {
  await requirePermission({ product: ["update"] });

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, variantIds } = parsed.data;

  // Scoped to the product rather than trusting the id list. `updateMany` with
  // the productId in the filter makes a stray id from another product a no-op
  // instead of silently renumbering that product's variants.
  await prisma.$transaction(
    variantIds.map((id, position) =>
      prisma.productVariant.updateMany({
        where: { id, productId },
        data: { position },
      }),
    ),
  );

  await touchProduct(productId);
  return { ok: true };
}

const generateSchema = z.object({
  productId: z.string().min(1),
  colours: z.array(z.string().trim().min(1).max(60)).max(20),
  sizes: z.array(z.string().trim().min(1).max(60)).max(20),
  sizeSystem: z
    .enum(["APPAREL", "FOOTWEAR", "ONESIZE"])
    .nullish()
    .transform((v) => v ?? null),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

/**
 * Build every colour × size combination in one pass.
 *
 * Typing eighteen rows by hand for a shirt in six colours and three sizes is
 * where data entry gives up and a shop ends up selling one generic variant.
 * Existing combinations are skipped rather than rejected, so this is also how
 * you add a new colour to a product that already has five.
 */
export async function generateVariants(
  input: z.input<typeof generateSchema>,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, sizeSystem, stock } = parsed.data;

  const colours = [...new Set(parsed.data.colours)];
  const sizes = [...new Set(parsed.data.sizes)];
  if (colours.length === 0 && sizes.length === 0) {
    return { ok: false, error: "Add at least one colour or size." };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  const existing = await prisma.productVariant.findMany({
    where: { productId },
    select: { colourName: true, sizeValue: true, position: true, sku: true },
  });
  const seen = new Set(
    existing.map((v) => `${v.colourName ?? ""}|${v.sizeValue ?? ""}`),
  );
  const usedSkus = new Set(existing.map((v) => v.sku));

  // A missing axis becomes a single null so the cross product still runs: six
  // colours and no sizes should give six variants, not none.
  const colourAxis: (string | null)[] = colours.length ? colours : [null];
  const sizeAxis: (string | null)[] = sizes.length ? sizes : [null];

  const base = skuBase(product.slug);
  let position = existing.reduce((max, v) => Math.max(max, v.position), -1) + 1;

  const rows: {
    productId: string;
    sku: string;
    colourName: string | null;
    sizeValue: string | null;
    sizeSystem: "APPAREL" | "FOOTWEAR" | "ONESIZE" | null;
    stock: number;
    position: number;
  }[] = [];

  for (const colourName of colourAxis) {
    for (const sizeValue of sizeAxis) {
      if (seen.has(`${colourName ?? ""}|${sizeValue ?? ""}`)) continue;

      const sku = uniqueSku(base, colourName, sizeValue, usedSkus);
      usedSkus.add(sku);
      rows.push({
        productId,
        sku,
        colourName,
        sizeValue,
        sizeSystem: sizeValue ? sizeSystem : null,
        stock,
        position: position++,
      });
    }
  }

  const skipped = colourAxis.length * sizeAxis.length - rows.length;
  if (rows.length === 0) {
    return { ok: false, error: "Every one of those already exists." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.createMany({ data: rows });

    if (stock > 0) {
      const created = await tx.productVariant.findMany({
        where: { sku: { in: rows.map((r) => r.sku) } },
        select: { id: true },
      });
      await tx.stockMovement.createMany({
        data: created.map((v) => ({
          variantId: v.id,
          delta: stock,
          reason: "RESTOCK" as const,
          note: "Opening count",
          createdById: session.user.id,
        })),
      });
    }
  });

  await recordAudit({
    userId: session.user.id,
    action: "variant.generate",
    entity: "Product",
    entityId: productId,
    after: { created: rows.length, colours, sizes, stock },
  });

  await touchProduct(productId);
  return { ok: true, data: { created: rows.length, skipped } };
}

/** `navy-cotton-shirt` → `NAVY-COTTON-SHIRT`, capped so SKUs stay readable. */
function skuBase(slug: string) {
  return slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .slice(0, 20);
}

function token(value: string | null) {
  if (!value) return "";
  return `-${value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6)}`;
}

/**
 * SKUs are globally unique, so a collision with an unrelated product is
 * possible — two shops' worth of "BLACK-M". The numeric suffix is a fallback,
 * not a naming scheme; it should almost never appear.
 */
function uniqueSku(
  base: string,
  colourName: string | null,
  sizeValue: string | null,
  used: Set<string>,
) {
  const candidate = `${base}${token(colourName)}${token(sizeValue)}`;
  if (!used.has(candidate)) return candidate;

  let n = 2;
  while (used.has(`${candidate}-${n}`)) n++;
  return `${candidate}-${n}`;
}
