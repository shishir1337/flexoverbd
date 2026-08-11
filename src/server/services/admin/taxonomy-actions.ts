"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { isCategoryTint } from "@/lib/category-tints";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { categoryTags, tags } from "@/server/cache-tags";

/**
 * Category, subcategory and brand mutations.
 *
 * Categories are the site's second-most-linked URL after products, so the same
 * two rules as `product-actions` apply: renaming a slug leaves a SlugHistory
 * row behind for the 301, and removal is an archive rather than a delete —
 * products point at these rows, and orders point at those products.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugField = z
  .string()
  .trim()
  .min(2, "Slug is required.")
  .regex(slugPattern, "Use lowercase letters, numbers and hyphens only.");

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/* ----------------------------------------------------------- Categories */

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required."),
  slug: slugField,
  shortName: z
    .string()
    .trim()
    .min(1, "Short name is required.")
    .max(20, "Keep it under 20 characters — it sits in the round scroller."),
  blurb: z.string().trim().max(160).default(""),
  // Checked against the closed palette: a tint outside it is a Tailwind class
  // that was never generated, so it would save cleanly and then render nothing.
  tint: z
    .string()
    .trim()
    .refine(isCategoryTint, "Pick one of the available tints."),
  isActive: z.boolean().default(true),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(180).default(""),
});

export type CategoryInput = z.input<typeof categorySchema>;

export async function saveCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ category: ["update"] });

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  const clash = await prisma.category.findFirst({
    where: { slug: d.slug, ...(d.id ? { id: { not: d.id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { slug: "Another category already uses this slug." },
    };
  }

  // Claiming a slug that a previous rename left a redirect for. Without this,
  // proxy would keep bouncing the new category's own URL to whatever displaced
  // it — a rename followed by reuse of the freed slug is rare but not exotic.
  await prisma.slugHistory.deleteMany({
    where: { entity: "category", oldSlug: d.slug },
  });

  const data = {
    name: d.name,
    slug: d.slug,
    shortName: d.shortName,
    blurb: d.blurb,
    tint: d.tint,
    isActive: d.isActive,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
  };

  try {
    if (d.id) {
      const before = await prisma.category.findUnique({ where: { id: d.id } });
      if (!before) return { ok: false, error: "Category not found." };

      const after = await prisma.category.update({
        where: { id: d.id },
        data,
      });

      if (before.slug !== after.slug) {
        await prisma.slugHistory.upsert({
          where: {
            entity_oldSlug: { entity: "category", oldSlug: before.slug },
          },
          update: { newSlug: after.slug },
          create: {
            entity: "category",
            oldSlug: before.slug,
            newSlug: after.slug,
          },
        });
        revalidateTag(tags.category(before.slug), "max");
      }

      await recordAudit({
        userId: session.user.id,
        action: "category.update",
        entity: "Category",
        entityId: after.id,
        before: { name: before.name, slug: before.slug },
        after: { name: after.name, slug: after.slug },
      });

      for (const tag of categoryTags(after.slug)) revalidateTag(tag, "max");
      revalidatePath("/admin/categories");
      return { ok: true, data: { id: after.id } };
    }

    // New categories go to the end of the scroller rather than the front —
    // an unfinished category should not displace the ones people already use.
    const last = await prisma.category.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const created = await prisma.category.create({
      data: { ...data, position: (last?.position ?? -1) + 1 },
    });

    await recordAudit({
      userId: session.user.id,
      action: "category.create",
      entity: "Category",
      entityId: created.id,
      after: { name: created.name, slug: created.slug },
    });

    for (const tag of categoryTags(created.slug)) revalidateTag(tag, "max");
    revalidatePath("/admin/categories");
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    console.error("saveCategory failed", e);
    return { ok: false, error: "Could not save the category. Please retry." };
  }
}

const archiveSchema = z.object({
  id: z.string().min(1),
  archived: z.boolean(),
});

export async function setCategoryArchived(
  input: z.input<typeof archiveSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ category: ["delete"] });

  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, archived } = parsed.data;

  // Archiving a category that still stocks products would strand them: they
  // would keep their category id, vanish from every listing, and remain
  // reachable only by direct URL. Refuse and say how many need moving.
  if (archived) {
    const stranded = await prisma.product.count({
      where: { categoryId: id, archivedAt: null },
    });
    if (stranded > 0) {
      return {
        ok: false,
        error: `${stranded} active ${
          stranded === 1 ? "product is" : "products are"
        } still in this category. Move or archive them first.`,
      };
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });

  await recordAudit({
    userId: session.user.id,
    action: archived ? "category.archive" : "category.restore",
    entity: "Category",
    entityId: id,
    after: { archived },
  });

  for (const tag of categoryTags(category.slug)) revalidateTag(tag, "max");
  revalidatePath("/admin/categories");
  return { ok: true };
}

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

/**
 * Positions are rewritten from the submitted order rather than swapped pairwise
 * — that way a list that has drifted out of sequence heals itself on the next
 * save instead of preserving the gaps.
 */
export async function reorderCategories(
  input: z.input<typeof reorderSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ category: ["update"] });

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  await prisma.$transaction(
    parsed.data.ids.map((id, position) =>
      prisma.category.update({ where: { id }, data: { position } }),
    ),
  );

  await recordAudit({
    userId: session.user.id,
    action: "category.reorder",
    entity: "Category",
    entityId: "*",
    after: { order: parsed.data.ids },
  });

  revalidateTag(tags.categories, "max");
  revalidatePath("/admin/categories");
  return { ok: true };
}

/* -------------------------------------------------------- Subcategories */

const subcategorySchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(2, "Name is required."),
  slug: slugField,
  isActive: z.boolean().default(true),
});

export type SubcategoryInput = z.input<typeof subcategorySchema>;

export async function saveSubcategory(
  input: SubcategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ category: ["update"] });

  const parsed = subcategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: d.categoryId },
    select: { slug: true },
  });
  if (!category) return { ok: false, error: "Category not found." };

  // Slugs are unique per category, not globally — /category/fashion/shirts and
  // /category/kids/shirts are both legitimate URLs.
  const clash = await prisma.subcategory.findFirst({
    where: {
      categoryId: d.categoryId,
      slug: d.slug,
      ...(d.id ? { id: { not: d.id } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { slug: "This category already has that slug." },
    };
  }

  try {
    if (d.id) {
      const after = await prisma.subcategory.update({
        where: { id: d.id },
        data: { name: d.name, slug: d.slug, isActive: d.isActive },
      });

      await recordAudit({
        userId: session.user.id,
        action: "subcategory.update",
        entity: "Subcategory",
        entityId: after.id,
        after: { name: after.name, slug: after.slug },
      });

      for (const tag of categoryTags(category.slug)) revalidateTag(tag, "max");
      revalidatePath(`/admin/categories/${d.categoryId}`);
      return { ok: true, data: { id: after.id } };
    }

    const last = await prisma.subcategory.findFirst({
      where: { categoryId: d.categoryId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const created = await prisma.subcategory.create({
      data: {
        categoryId: d.categoryId,
        name: d.name,
        slug: d.slug,
        isActive: d.isActive,
        position: (last?.position ?? -1) + 1,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: "subcategory.create",
      entity: "Subcategory",
      entityId: created.id,
      after: { name: created.name, slug: created.slug },
    });

    for (const tag of categoryTags(category.slug)) revalidateTag(tag, "max");
    revalidatePath(`/admin/categories/${d.categoryId}`);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    console.error("saveSubcategory failed", e);
    return { ok: false, error: "Could not save. Please retry." };
  }
}

export async function setSubcategoryArchived(
  input: z.input<typeof archiveSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ category: ["delete"] });

  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, archived } = parsed.data;

  if (archived) {
    const stranded = await prisma.product.count({
      where: { subcategoryId: id, archivedAt: null },
    });
    if (stranded > 0) {
      return {
        ok: false,
        error: `${stranded} active ${
          stranded === 1 ? "product is" : "products are"
        } still in this subcategory. Move them first.`,
      };
    }
  }

  const sub = await prisma.subcategory.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
    include: { category: { select: { slug: true } } },
  });

  await recordAudit({
    userId: session.user.id,
    action: archived ? "subcategory.archive" : "subcategory.restore",
    entity: "Subcategory",
    entityId: id,
    after: { archived },
  });

  for (const tag of categoryTags(sub.category.slug)) revalidateTag(tag, "max");
  revalidatePath(`/admin/categories/${sub.categoryId}`);
  return { ok: true };
}

/* --------------------------------------------------------------- Brands */

const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required."),
  slug: slugField,
});

export type BrandInput = z.input<typeof brandSchema>;

export async function saveBrand(
  input: BrandInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ category: ["update"] });

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  const clash = await prisma.brand.findFirst({
    where: { slug: d.slug, ...(d.id ? { id: { not: d.id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { slug: "Another brand already uses this slug." },
    };
  }

  try {
    const saved = d.id
      ? await prisma.brand.update({
          where: { id: d.id },
          data: { name: d.name, slug: d.slug },
        })
      : await prisma.brand.create({ data: { name: d.name, slug: d.slug } });

    await recordAudit({
      userId: session.user.id,
      action: d.id ? "brand.update" : "brand.create",
      entity: "Brand",
      entityId: saved.id,
      after: { name: saved.name, slug: saved.slug },
    });

    // Brand names render on every product card and the PDP.
    revalidateTag(tags.brands, "max");
    revalidateTag(tags.products, "max");
    revalidatePath("/admin/categories");
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    console.error("saveBrand failed", e);
    return { ok: false, error: "Could not save the brand. Please retry." };
  }
}

/**
 * Brands have no `archivedAt` — nothing links to a brand page, so there is no
 * URL to preserve. Deletion is therefore real, and only allowed once no
 * product still references it.
 */
export async function deleteBrand(id: string): Promise<ActionResult> {
  const session = await requirePermission({ category: ["delete"] });

  const inUse = await prisma.product.count({ where: { brandId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: `${inUse} ${
        inUse === 1 ? "product uses" : "products use"
      } this brand. Reassign them first.`,
    };
  }

  const before = await prisma.brand.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "Brand not found." };

  await prisma.brand.delete({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "brand.delete",
    entity: "Brand",
    entityId: id,
    before: { name: before.name, slug: before.slug },
  });

  revalidateTag(tags.brands, "max");
  revalidatePath("/admin/categories");
  return { ok: true };
}
