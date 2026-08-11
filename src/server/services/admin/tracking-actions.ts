"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

export type TrackingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  /**
   * Meta pixel ids are numeric, 15–16 digits. Validated because a pasted URL or
   * a token in the wrong box would otherwise sit there looking connected while
   * silently tracking nothing.
   */
  metaPixelId: z
    .string()
    .trim()
    .regex(/^\d{10,20}$/, "A pixel ID is 15–16 digits, e.g. 1234567890123456.")
    .or(z.literal("")),

  /**
   * Blank means "leave the saved token alone".
   *
   * The form never receives the current token, so it cannot send it back — an
   * empty field is the normal state when editing anything else on this screen,
   * and treating that as "delete the token" would disconnect the shop every
   * time someone corrected a typo in the pixel id.
   */
  metaAccessToken: z.string().trim().or(z.literal("")),

  metaTestEventCode: z.string().trim().max(40).or(z.literal("")),

  /** Explicit, deliberate removal — the only way to clear a saved token. */
  clearToken: z.boolean().default(false),
});

export type TrackingInput = z.input<typeof schema>;

/**
 * Save Meta tracking credentials.
 *
 * The access token can write conversion events into the client's ad account, so
 * it is never echoed back to the browser and never written to the audit log —
 * only the fact that it changed.
 */
export async function saveTrackingSettings(
  input: TrackingInput,
): Promise<TrackingResult> {
  const session = await requirePermission({ settings: ["update"] });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the form.", fieldErrors };
  }

  const { metaPixelId, metaAccessToken, metaTestEventCode, clearToken } =
    parsed.data;

  const existing =
    ((await prisma.setting.findUnique({ where: { key: "tracking" } }))
      ?.value as Record<string, string>) ?? {};

  const next: Record<string, string> = {
    ...existing,
    metaPixelId,
    metaTestEventCode,
  };

  if (clearToken) {
    delete next.metaAccessToken;
  } else if (metaAccessToken) {
    next.metaAccessToken = metaAccessToken;
  }
  // Otherwise the stored token carries over untouched.

  await prisma.setting.upsert({
    where: { key: "tracking" },
    update: { value: next },
    create: { key: "tracking", value: next },
  });

  await recordAudit({
    userId: session.user.id,
    action: "settings.tracking.update",
    entity: "Setting",
    entityId: "tracking",
    // Deliberately records only *that* the token changed. Writing the value
    // would put a live credential into a log the whole owner role can read.
    after: {
      metaPixelId,
      metaTestEventCode,
      tokenAction: clearToken
        ? "cleared"
        : metaAccessToken
          ? "replaced"
          : "unchanged",
    },
  });

  // The pixel id is read by the storefront layout on every page.
  revalidateTag(tags.settings, "max");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
