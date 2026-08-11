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
 * A product's gallery.
 *
 * `ProductImage` is a join between a product and a library asset rather than a
 * URL on the product, which is what lets the same photograph appear on a
 * product, a category tile and a banner without three uploads — and what makes
 * "where is this image used" answerable in Media.
 *
 * Position 0 is the primary image: the one on the card, in search results and
 * in the Open Graph tag. There is no separate `isPrimary` flag because two
 * sources of truth for "which one is first" is how you end up with a product
 * whose card and gallery disagree.
 */

async function touchProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return;

  // The gallery is on the product page, the primary image is on every card,
  // and both are cached under the product's tags.
  for (const tag of productTags(product.slug)) revalidateTag(tag, "max");
  revalidatePath(`/admin/products/${productId}`);
}

const attachSchema = z.object({
  productId: z.string().min(1),
  mediaIds: z.array(z.string().min(1)).min(1).max(20),
});

export async function attachProductImages(
  input: z.input<typeof attachSchema>,
): Promise<ActionResult<{ added: number }>> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, mediaIds } = parsed.data;

  const [existing, assets] = await Promise.all([
    prisma.productImage.findMany({
      where: { productId },
      select: { mediaId: true, position: true },
    }),
    prisma.mediaAsset.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true, alt: true },
    }),
  ]);

  const already = new Set(existing.map((e) => e.mediaId));
  // Silently skipping a duplicate beats an error: picking eight images when
  // one is already attached should add the seven, not refuse the lot.
  const fresh = assets.filter((a) => !already.has(a.id));
  if (fresh.length === 0) {
    return { ok: false, error: "Those images are already on this product." };
  }

  const nextPosition =
    existing.reduce((max, e) => Math.max(max, e.position), -1) + 1;

  await prisma.productImage.createMany({
    data: fresh.map((asset, i) => ({
      productId,
      mediaId: asset.id,
      // Seeded from the asset's own alt text so a described image arrives
      // described. Per-product alt can still differ — the same photo means
      // something different on a category tile.
      alt: asset.alt,
      position: nextPosition + i,
    })),
  });

  await recordAudit({
    userId: session.user.id,
    action: "product.images.attach",
    entity: "Product",
    entityId: productId,
    after: { mediaIds: fresh.map((a) => a.id) },
  });

  await touchProduct(productId);
  return { ok: true, data: { added: fresh.length } };
}

const detachSchema = z.object({
  productId: z.string().min(1),
  imageId: z.string().min(1),
});

export async function detachProductImage(
  input: z.input<typeof detachSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = detachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, imageId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });

    // Positions are rewritten from the surviving order rather than left with a
    // gap. A list that heals itself cannot drift into two images both claiming
    // position 3 after a few removals.
    const rest = await tx.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [i, row] of rest.entries()) {
      await tx.productImage.update({
        where: { id: row.id },
        data: { position: i },
      });
    }
  });

  await recordAudit({
    userId: session.user.id,
    action: "product.images.detach",
    entity: "Product",
    entityId: productId,
    before: { imageId },
  });

  await touchProduct(productId);
  return { ok: true };
}

const reorderSchema = z.object({
  productId: z.string().min(1),
  imageIds: z.array(z.string().min(1)).min(1),
});

export async function reorderProductImages(
  input: z.input<typeof reorderSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { productId, imageIds } = parsed.data;

  // Scoped to the product rather than trusting the id list, so an id belonging
  // to another product's gallery is a no-op instead of reshuffling it.
  await prisma.$transaction(
    imageIds.map((id, position) =>
      prisma.productImage.updateMany({
        where: { id, productId },
        data: { position },
      }),
    ),
  );

  await recordAudit({
    userId: session.user.id,
    action: "product.images.reorder",
    entity: "Product",
    entityId: productId,
    after: { order: imageIds },
  });

  await touchProduct(productId);
  return { ok: true };
}

const altSchema = z.object({
  productId: z.string().min(1),
  imageId: z.string().min(1),
  alt: z.string().trim().max(160, "Keep alt text under 160 characters."),
});

/**
 * Per-product alt text.
 *
 * Separate from the library asset's own alt because the same photograph
 * describes different things in different places — "navy cotton shirt, front"
 * on the product, "menswear" on a category tile.
 */
export async function setProductImageAlt(
  input: z.input<typeof altSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ product: ["update"] });

  const parsed = altSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { productId, imageId, alt } = parsed.data;

  await prisma.productImage.update({ where: { id: imageId }, data: { alt } });

  await recordAudit({
    userId: session.user.id,
    action: "product.images.alt",
    entity: "Product",
    entityId: productId,
    after: { imageId, alt },
  });

  await touchProduct(productId);
  return { ok: true };
}
