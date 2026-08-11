"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

export type ActionResult = { ok: true } | { ok: false; error: string };

const altSchema = z.object({
  id: z.string().min(1),
  alt: z.string().trim().max(160, "Keep alt text under 160 characters."),
});

/**
 * Alt text.
 *
 * Editable on its own because it is the one field on an image that is worth
 * fixing without re-uploading anything: it is what a screen reader announces
 * and what Google reads, and the demo data filled it in generically.
 */
export async function saveMediaAlt(
  input: z.input<typeof altSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ media: ["upload"] });

  const parsed = altSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }

  await prisma.mediaAsset.update({
    where: { id: parsed.data.id },
    data: { alt: parsed.data.alt },
  });

  await recordAudit({
    userId: session.user.id,
    action: "media.alt.update",
    entity: "MediaAsset",
    entityId: parsed.data.id,
    after: { alt: parsed.data.alt },
  });

  // Alt text is baked into product, category and banner markup.
  revalidateTag(tags.products, "max");
  revalidateTag(tags.categories, "max");
  revalidateTag(tags.banners, "max");
  revalidatePath("/admin/media");
  return { ok: true };
}

const bannerImageSchema = z.object({
  bannerId: z.string().min(1),
  /** Empty string clears the slot. */
  desktopId: z.string(),
  mobileId: z.string(),
});

/**
 * Assign artwork to a banner.
 *
 * Lives here rather than on the banner form because choosing an image means
 * looking at images — the banner screen owns copy and scheduling, and this owns
 * the picture.
 */
export async function setBannerImages(
  input: z.input<typeof bannerImageSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ content: ["update"] });

  const parsed = bannerImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { bannerId, desktopId, mobileId } = parsed.data;

  await prisma.banner.update({
    where: { id: bannerId },
    data: {
      imageDesktopId: desktopId || null,
      imageMobileId: mobileId || null,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "content.banner.images",
    entity: "Banner",
    entityId: bannerId,
    after: { desktopId, mobileId },
  });

  revalidateTag(tags.banners, "max");
  revalidatePath("/admin/media");
  revalidatePath("/admin/content/banners");
  return { ok: true };
}

const searchSchema = z.object({
  q: z.string().trim().max(80).default(""),
  folder: z.string().max(60).optional(),
});

/**
 * Library lookup for the image picker.
 *
 * Folder is a *preference*, not a filter: someone attaching a product photo
 * usually wants the products folder first, but the shot they need might have
 * been uploaded to banners last week. So matches inside the folder sort first
 * and everything else follows, rather than the rest being hidden.
 */
export async function searchMedia(
  input: z.input<typeof searchSchema>,
): Promise<{ id: string; url: string; alt: string; folder: string | null }[]> {
  await requirePermission({ media: ["read"] });

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return [];
  const { q, folder } = parsed.data;

  const rows = await prisma.mediaAsset.findMany({
    where: q
      ? {
          OR: [
            { alt: { contains: q, mode: "insensitive" } },
            { url: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, url: true, alt: true, folder: true },
  });

  if (!folder) return rows;
  return [
    ...rows.filter((r) => r.folder === folder),
    ...rows.filter((r) => r.folder !== folder),
  ];
}
