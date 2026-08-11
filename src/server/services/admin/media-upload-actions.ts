"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { env } from "@/env";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Recording and removing uploaded media.
 *
 * The file itself never passes through here — the browser sends it straight to
 * ImageKit with a signed token. What this does is write the row that makes the
 * upload *ours*: without a MediaAsset the file exists in the CDN and is
 * invisible to every screen in the admin.
 */

/**
 * `navy-summer-shirt_front-2.jpg` -> `Navy summer shirt front 2`.
 *
 * Drops the extension and the random suffix ImageKit appends to keep names
 * unique, then turns separators into spaces.
 */
function altFromFileName(fileName?: string): string {
  if (!fileName) return "";
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_[A-Za-z0-9_-]{8,}$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
    .slice(0, 160);
}

const recordSchema = z.object({
  /** ImageKit's own id, needed later to delete the file. */
  fileId: z.string().min(1),
  url: z.url(),
  thumbnailUrl: z.string().optional(),
  alt: z.string().trim().max(160).default(""),
  /** Original filename, used to seed alt text when none was typed. */
  fileName: z.string().max(200).optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  mimeType: z.string().max(80).optional(),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
  folder: z.string().max(60).optional(),
});

export async function recordUploadedMedia(
  input: z.input<typeof recordSchema>,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ media: ["upload"] });

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That upload could not be recorded." };
  }
  const d = parsed.data;

  // An empty alt is an accessibility hole and shows as a red "No alt text"
  // warning on every gallery. A filename is a poor description, but it is a
  // real one and it is better than nothing — and it gives whoever edits it
  // later something to correct rather than a blank box to compose in.
  const alt = d.alt || altFromFileName(d.fileName);

  try {
    // Upserted on the ImageKit id so a retried upload of the same file cannot
    // leave two rows pointing at one CDN object.
    const asset = await prisma.mediaAsset.upsert({
      where: { imagekitId: d.fileId },
      update: { url: d.url, thumbnailUrl: d.thumbnailUrl ?? null },
      create: {
        imagekitId: d.fileId,
        url: d.url,
        thumbnailUrl: d.thumbnailUrl ?? null,
        alt,
        width: d.width ?? null,
        height: d.height ?? null,
        mimeType: d.mimeType ?? null,
        sizeBytes: d.sizeBytes ?? null,
        folder: d.folder ?? null,
        uploadedById: session.user.id,
        // Real artwork, so it never shows in the "still placeholders" report.
        demoSource: null,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: "media.upload",
      entity: "MediaAsset",
      entityId: asset.id,
      after: { url: d.url, folder: d.folder ?? null },
    });

    revalidatePath("/admin/media");
    return { ok: true, data: { id: asset.id } };
  } catch (e) {
    console.error("recordUploadedMedia failed", e);
    return { ok: false, error: "Uploaded, but could not be saved. Retry." };
  }
}

/**
 * Delete from ImageKit's media library.
 *
 * Called before the database row goes, so a failure leaves the asset visible
 * and retryable rather than orphaning a file nobody can find again. ImageKit
 * has no Node SDK method in `@imagekit/next` for this — it is a client-side
 * package — so this is the REST API with Basic auth, which is what the private
 * key is for.
 */
async function deleteFromImageKit(fileId: string): Promise<boolean> {
  if (!env.IMAGEKIT_PRIVATE_KEY) return false;

  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: {
        // Basic auth with the private key as the username and an empty
        // password, per ImageKit's API reference.
        Authorization: `Basic ${Buffer.from(`${env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`,
      },
    },
  );

  // 404 means it is already gone, which is the state we wanted anyway.
  return response.ok || response.status === 404;
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const session = await requirePermission({ media: ["delete"] });

  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          categories: true,
          brands: true,
          productImages: true,
          bannersDesktop: true,
          bannersMobile: true,
          screenshots: true,
        },
      },
    },
  });
  if (!asset) return { ok: false, error: "That image no longer exists." };

  const uses =
    asset._count.categories +
    asset._count.brands +
    asset._count.productImages +
    asset._count.bannersDesktop +
    asset._count.bannersMobile +
    asset._count.screenshots;

  // Refused rather than cascaded: deleting an image still on a live product
  // leaves a hole on the storefront, and the person clicking delete in a media
  // library is not thinking about which pages it is on.
  if (uses > 0) {
    return {
      ok: false,
      error: `Still used in ${uses} ${uses === 1 ? "place" : "places"}. Replace it there first.`,
    };
  }

  if (asset.imagekitId) {
    const removed = await deleteFromImageKit(asset.imagekitId);
    if (!removed) {
      return {
        ok: false,
        error: "ImageKit would not delete the file. Nothing was changed.",
      };
    }
  }

  await prisma.mediaAsset.delete({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "media.delete",
    entity: "MediaAsset",
    entityId: id,
    before: { url: asset.url },
  });

  revalidateTag(tags.products, "max");
  revalidateTag(tags.categories, "max");
  revalidateTag(tags.banners, "max");
  revalidatePath("/admin/media");
  return { ok: true };
}
