"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DRAFT_TITLE } from "@/lib/product-draft";
import { recordAudit } from "@/server/audit";
import { productTags, tags } from "@/server/cache-tags";

/**
 * Product mutations.
 *
 * Two things every action here gets right, because getting them wrong is
 * expensive:
 *
 *  1. **Slugs are never silently reused.** Renaming records the old slug in
 *     SlugHistory so the proxy can 301 it — a renamed product must not lose
 *     its search ranking or break inbound links.
 *  2. **Stock is never set by a bare update.** Adjustments go through the
 *     ledger, so the number on the page is always explainable.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(slugPattern, "Use lowercase letters, numbers and hyphens only."),
  brandId: z.string().nullish(),
  categoryId: z.string().min(1, "Choose a category."),
  subcategoryId: z.string().nullish(),
  description: z.string().trim().max(4000).nullish(),
  price: z.coerce.number().int().min(1, "Price must be at least ৳1."),
  compareAt: z.coerce.number().int().min(0).nullish(),
  badge: z.enum(["NEW", "BESTSELLER", "LIMITED", "RESTOCK"]).nullish(),
  freeDelivery: z.boolean().default(false),
  tags: z.string().trim().default(""),
  seoTitle: z.string().trim().max(70).nullish(),
  seoDescription: z.string().trim().max(180).nullish(),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});

export type ProductInput = z.input<typeof productSchema>;

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function saveProduct(
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.compareAt && d.compareAt <= d.price) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: {
        compareAt: "Compare-at price must be higher than the price.",
      },
    };
  }

  const clash = await prisma.product.findFirst({
    where: { slug: d.slug, ...(d.id ? { id: { not: d.id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { slug: "Another product already uses this slug." },
    };
  }

  // See the equivalent in taxonomy-actions: a slug freed by an earlier rename
  // and then claimed again must stop redirecting, or the new product's URL
  // bounces to the one that took its old name.
  await prisma.slugHistory.deleteMany({
    where: { entity: "product", oldSlug: d.slug },
  });

  const data = {
    title: d.title,
    slug: d.slug,
    brandId: d.brandId || null,
    categoryId: d.categoryId,
    subcategoryId: d.subcategoryId || null,
    description: d.description || null,
    price: d.price,
    compareAt: d.compareAt || null,
    badge: d.badge || null,
    freeDelivery: d.freeDelivery,
    tags: d.tags
      ? d.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    isActive: d.isActive,
    publishedAt: d.isPublished ? new Date() : null,
  };

  try {
    if (d.id) {
      const before = await prisma.product.findUnique({ where: { id: d.id } });
      if (!before) return { ok: false, error: "Product not found." };

      // Keep the publish date rather than resetting it on every save.
      const publishedAt = d.isPublished
        ? (before.publishedAt ?? new Date())
        : null;

      const after = await prisma.product.update({
        where: { id: d.id },
        data: { ...data, publishedAt },
      });

      // A changed slug leaves a redirect behind it.
      if (before.slug !== after.slug) {
        await prisma.slugHistory.upsert({
          where: {
            entity_oldSlug: { entity: "product", oldSlug: before.slug },
          },
          update: { newSlug: after.slug },
          create: {
            entity: "product",
            oldSlug: before.slug,
            newSlug: after.slug,
          },
        });
        revalidateTag(tags.product(before.slug), "max");
      }

      await recordAudit({
        userId: session.user.id,
        action: "product.update",
        entity: "Product",
        entityId: after.id,
        before: { title: before.title, price: before.price, slug: before.slug },
        after: { title: after.title, price: after.price, slug: after.slug },
      });

      for (const tag of productTags(after.slug)) revalidateTag(tag, "max");
      revalidatePath("/admin/products");
      return { ok: true, data: { id: after.id } };
    }

    const created = await prisma.product.create({
      data: {
        ...data,
        // Every product needs at least one variant, or it has nowhere to hold
        // stock and cannot be added to a cart.
        variants: {
          create: {
            sku: `${d.slug.toUpperCase().slice(0, 20)}-DEFAULT`,
            stock: 0,
            position: 0,
          },
        },
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: "product.create",
      entity: "Product",
      entityId: created.id,
      after: { title: created.title, slug: created.slug },
    });

    for (const tag of productTags(created.slug)) revalidateTag(tag, "max");
    revalidatePath("/admin/products");
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    console.error("saveProduct failed", e);
    return { ok: false, error: "Could not save the product. Please retry." };
  }
}

const archiveSchema = z.object({
  id: z.string().min(1),
  archived: z.boolean(),
});

/**
 * Archive rather than delete. Order history references products, and inbound
 * links and search results keep pointing at the URL — a hard delete breaks
 * both, permanently.
 */
export async function setProductArchived(
  input: z.input<typeof archiveSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["delete"] });

  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, archived } = parsed.data;

  const product = await prisma.product.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });

  await recordAudit({
    userId: session.user.id,
    action: archived ? "product.archive" : "product.restore",
    entity: "Product",
    entityId: id,
    after: { archived },
  });

  for (const tag of productTags(product.slug)) revalidateTag(tag, "max");
  revalidatePath("/admin/products");
  return { ok: true };
}

const stockSchema = z.object({
  variantId: z.string().min(1),
  newStock: z.coerce.number().int().min(0),
  note: z.string().trim().max(200).optional(),
});

/**
 * Stock is set to an absolute figure — that is how someone counting a shelf
 * thinks — but recorded as the *delta* in the ledger, so the running total
 * always reconciles.
 */
export async function adjustStock(
  input: z.input<typeof stockSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ inventory: ["adjust"] });

  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a whole number of units." };
  }
  const { variantId, newStock, note } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { slug: true } } },
  });
  if (!variant) return { ok: false, error: "Variant not found." };

  const delta = newStock - variant.stock;
  if (delta === 0) return { ok: true };

  await prisma.$transaction([
    prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        variantId,
        delta,
        reason: "MANUAL_ADJUST",
        note: note || null,
        createdById: session.user.id,
      },
    }),
  ]);

  await recordAudit({
    userId: session.user.id,
    action: "inventory.adjust",
    entity: "ProductVariant",
    entityId: variantId,
    before: { stock: variant.stock },
    after: { stock: newStock, delta },
  });

  for (const tag of productTags(variant.product.slug)) {
    revalidateTag(tag, "max");
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

const bulkProductSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "archive", "restore"]),
});

/**
 * Publish, unpublish, archive or restore several products at once.
 *
 * Seasonal catalogues move in blocks — winter stock goes live together and
 * comes down together — and doing that a product at a time is a page load
 * each. Archive stays a soft delete here exactly as it is individually: orders
 * reference products, and inbound links and search results keep pointing at
 * the URL.
 */
export async function bulkProductAction(
  input: z.input<typeof bulkProductSchema>,
): Promise<ActionResult<{ changed: number; skipped: number }>> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = bulkProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { ids, action } = parsed.data;

  const found = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, title: true, price: true },
  });
  if (found.length === 0) return { ok: false, error: "Nothing to change." };

  /**
   * Publishing is the one action here that can put something in front of a
   * customer, so it gets the completeness check the single-product form already
   * enforces. Without it, selecting an untouched draft and hitting Publish sent
   * a ৳0 "Untitled product" to the storefront, where it could be added to a
   * cart and ordered for nothing.
   *
   * Unpublish, archive and restore all move *away* from the customer, so an
   * incomplete product is never a reason to block them.
   */
  const incomplete =
    action === "publish"
      ? found.filter((p) => p.price < 1 || p.title === DRAFT_TITLE)
      : [];
  const products = found.filter((p) => !incomplete.includes(p));

  if (products.length === 0) {
    return {
      ok: false,
      error:
        incomplete.length === 1
          ? "That product still needs a title and a price before it can go live."
          : `Those ${incomplete.length} products still need a title and a price before they can go live.`,
    };
  }

  const data =
    action === "publish"
      ? { publishedAt: new Date(), isActive: true }
      : action === "unpublish"
        ? { publishedAt: null }
        : action === "archive"
          ? { archivedAt: new Date() }
          : { archivedAt: null };

  try {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: products.map((p) => p.id) } },
      data,
    });

    await recordAudit({
      userId: session.user.id,
      action: `product.bulk.${action}`,
      entity: "Product",
      entityId: "*",
      after: { ids: products.map((p) => p.id), action },
    });

    // Every affected slug, plus the collections that list them.
    for (const product of products) {
      for (const tag of productTags(product.slug)) revalidateTag(tag, "max");
    }
    revalidatePath("/admin/products");
    return { ok: true, data: { changed: count, skipped: incomplete.length } };
  } catch (e) {
    console.error("bulkProductAction failed", e);
    return { ok: false, error: "Could not apply that to every product." };
  }
}

/**
 * Start a product and land straight in the full editor.
 *
 * The old flow made you fill a form, save, and only *then* revealed photos and
 * variants — so adding a product meant two mental phases and a page you could
 * not finish the job on. Shopify and WooCommerce both show everything at once,
 * and the reason they can is that the product row already exists behind the
 * scenes; the "new" screen is really an editor for an unsaved draft.
 *
 * This does the same thing the direct way: create the row first, redirect to
 * the editor, and let every section — details, photos, variants — be available
 * from the first moment.
 *
 * Drafts are created unpublished and inactive, so nothing reaches the
 * storefront until it is deliberately published. An abandoned draft is reused
 * rather than piling up: someone who clicks "New product" three times and
 * wanders off leaves one placeholder, not three.
 */
export async function createDraftProduct(): Promise<
  ActionResult<{ id: string }>
> {
  const session = await requirePermission({ product: ["create"] });

  const category = await prisma.category.findFirst({
    where: { archivedAt: null },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (!category) {
    return {
      ok: false,
      error: "Create a category first — a product has to live somewhere.",
    };
  }

  // Reuse an untouched draft of theirs if one is lying around. "Untouched"
  // means still carrying the placeholder title and no price, which is exactly
  // the state this function leaves behind.
  const abandoned = await prisma.product.findFirst({
    where: {
      title: DRAFT_TITLE,
      price: 0,
      publishedAt: null,
      archivedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (abandoned) return { ok: true, data: { id: abandoned.id } };

  const product = await prisma.product.create({
    data: {
      title: DRAFT_TITLE,
      // Unique and obviously temporary. Replaced the moment a real title is
      // typed, and the slug field follows the title until someone edits it.
      slug: `draft-${Date.now().toString(36)}`,
      categoryId: category.id,
      price: 0,
      isActive: false,
      publishedAt: null,
    },
    select: { id: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "product.draft.create",
    entity: "Product",
    entityId: product.id,
  });

  revalidatePath("/admin/products");
  return { ok: true, data: { id: product.id } };
}
