"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

/**
 * Editorial content mutations.
 *
 * Five of these lists — announcements, trending searches, FAQ entries, trust
 * items, nav links — differ only in their columns. One registry keyed by kind
 * beats five near-identical action files: the permission check, audit entry,
 * ordering and cache invalidation are written once, so a new list cannot ship
 * with the invalidation quietly missing. Banners, review screenshots and pages
 * carry rules of their own and get dedicated actions below.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Empty string means "no date", not "1970" — the form always submits a string,
 * and an unset date input submits an empty one. The default sits before the
 * transform so the parsed type stays `Date | null` rather than widening back to
 * include the raw input.
 */
const optionalDate = z
  .string()
  .trim()
  .default("")
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date.");

/** Same idea for text: blank is absence, and absence is NULL in the column. */
const optionalText = z
  .string()
  .trim()
  .default("")
  .transform((v) => v || null);

const announcementSchema = z.object({
  text: z.string().trim().min(2, "Say something.").max(120, "Keep it short."),
  isActive: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

const trendingSchema = z.object({
  term: z.string().trim().min(2, "Enter a search term.").max(40),
  isActive: z.boolean().default(true),
});

const faqSchema = z.object({
  question: z.string().trim().min(4, "Enter a question."),
  answer: z.string().trim().min(4, "Enter an answer."),
  group: optionalText,
  ctaLabel: optionalText,
  ctaHref: optionalText,
  isActive: z.boolean().default(true),
});

const trustSchema = z.object({
  icon: z.string().trim().min(1, "Pick an icon."),
  title: z.string().trim().min(2, "Enter a title."),
  subtitle: optionalText,
  isActive: z.boolean().default(true),
});

const navLinkSchema = z.object({
  group: z.enum([
    "FOOTER_HELP",
    "FOOTER_COMPANY",
    "MOBILE_SHORTCUT",
    "MOBILE_HELP",
  ]),
  label: z.string().trim().min(1, "Enter a label."),
  href: z
    .string()
    .trim()
    .min(1, "Enter a path.")
    .refine(
      (v) => v.startsWith("/") || v.startsWith("http"),
      "Use a path like /offers, or a full URL.",
    ),
  icon: optionalText,
  isActive: z.boolean().default(true),
});

/**
 * Kind → everything that differs.
 *
 * `invalidate` lists the tags a change reaches. Announcements are read by the
 * bar on every page and nav links by the header and footer, so getting this
 * wrong shows up as an edit that appears in the admin and nowhere else.
 */
const KINDS = {
  announcement: {
    schema: announcementSchema,
    label: "Announcement",
    invalidate: [tags.announcements],
    model: "announcement",
  },
  trending: {
    schema: trendingSchema,
    label: "Trending search",
    invalidate: [tags.trending],
    model: "trendingSearch",
  },
  faq: {
    schema: faqSchema,
    label: "FAQ entry",
    invalidate: [tags.faq],
    model: "faqItem",
  },
  trust: {
    schema: trustSchema,
    label: "Trust item",
    invalidate: [tags.trustItems],
    model: "trustItem",
  },
  navLink: {
    schema: navLinkSchema,
    label: "Nav link",
    invalidate: [tags.navLinks],
    model: "navLink",
  },
} as const;

export type ContentKind = keyof typeof KINDS;

/**
 * Prisma's per-model delegates share no supertype, so the registry stores a
 * model *name* and this narrows the looked-up client to the four methods used
 * here — all of which every delegate provides with identical semantics. Taking
 * the client as an argument is what lets the reorder path pass a transaction
 * client instead of the global one.
 */
type MinimalDelegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  findFirst: (args: {
    orderBy: { position: "desc" };
    select: { position: true };
  }) => Promise<{ position: number } | null>;
};

type AnyClient = Record<string, unknown>;

function delegateFor(
  kind: ContentKind,
  client: AnyClient = prisma as unknown as AnyClient,
): MinimalDelegate {
  return client[KINDS[kind].model] as MinimalDelegate;
}

function invalidate(kind: ContentKind) {
  for (const tag of KINDS[kind].invalidate) revalidateTag(tag, "max");
  revalidatePath("/admin/content");
}

export async function saveContentItem(
  kind: ContentKind,
  id: string | null,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ content: ["update"] });

  const entry = KINDS[kind];
  if (!entry) return { ok: false, error: "Unknown content type." };

  const parsed = entry.schema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const delegate = delegateFor(kind);
  const data = parsed.data as Record<string, unknown>;

  try {
    if (id) {
      const saved = await delegate.update({ where: { id }, data });
      await recordAudit({
        userId: session.user.id,
        action: `content.${kind}.update`,
        entity: entry.label,
        entityId: id,
        after: data as never,
      });
      invalidate(kind);
      return { ok: true, data: { id: saved.id } };
    }

    // New rows land at the end. An announcement appearing at the front of the
    // rotation the moment it is created is not what anyone drafting one wants.
    const last = await delegate.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const saved = await delegate.create({
      data: { ...data, position: (last?.position ?? -1) + 1 },
    });

    await recordAudit({
      userId: session.user.id,
      action: `content.${kind}.create`,
      entity: entry.label,
      entityId: saved.id,
      after: data as never,
    });
    invalidate(kind);
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    // A duplicate is the one failure here that is the author's to fix, and the
    // generic message sent them to a dead end — a trending term that already
    // exists looked identical to the database being down. Name the field so the
    // form can point at it.
    const duplicate = uniqueViolationField(e);
    if (duplicate) {
      return {
        ok: false,
        error: "Please check the form.",
        fieldErrors: {
          [duplicate]: `That ${duplicate} is already in the list.`,
        },
      };
    }

    console.error(`saveContentItem(${kind}) failed`, e);
    return {
      ok: false,
      error: `Could not save the ${entry.label.toLowerCase()}.`,
    };
  }
}

/**
 * The column name behind a Prisma P2002, or null if this was any other error.
 *
 * Two shapes, because we run the `pg` driver adapter. The documented one is
 * `meta.target`; under a driver adapter Prisma instead forwards the driver's
 * own constraint description and `meta.target` is absent entirely. Reading only
 * the documented field is why this looked like an unknown failure.
 */
function uniqueViolationField(e: unknown): string | null {
  if (
    typeof e !== "object" ||
    e === null ||
    (e as { code?: string }).code !== "P2002"
  ) {
    return null;
  }

  const meta = (e as { meta?: Record<string, unknown> }).meta ?? {};

  const target = meta.target;
  if (Array.isArray(target) && typeof target[0] === "string") return target[0];
  if (typeof target === "string") return target;

  const fields = (
    meta.driverAdapterError as
      | { cause?: { constraint?: { fields?: unknown } } }
      | undefined
  )?.cause?.constraint?.fields;
  if (Array.isArray(fields) && typeof fields[0] === "string") return fields[0];

  return null;
}

/**
 * A real delete, unlike products and categories.
 *
 * Nothing links to an announcement or a trending term — there is no URL to
 * preserve and no order that references one — so keeping tombstones would just
 * be a list that grows forever. Anything that needs to disappear temporarily
 * has `isActive` instead.
 */
export async function deleteContentItem(
  kind: ContentKind,
  id: string,
): Promise<ActionResult> {
  const session = await requirePermission({ content: ["delete"] });

  const entry = KINDS[kind];
  if (!entry) return { ok: false, error: "Unknown content type." };

  try {
    await delegateFor(kind).delete({ where: { id } });
    await recordAudit({
      userId: session.user.id,
      action: `content.${kind}.delete`,
      entity: entry.label,
      entityId: id,
    });
    invalidate(kind);
    return { ok: true };
  } catch (e) {
    console.error(`deleteContentItem(${kind}) failed`, e);
    return { ok: false, error: "Could not delete it." };
  }
}

export async function reorderContentItems(
  kind: ContentKind,
  ids: string[],
): Promise<ActionResult> {
  const session = await requirePermission({ content: ["update"] });

  const entry = KINDS[kind];
  if (!entry) return { ok: false, error: "Unknown content type." };
  if (ids.length === 0) return { ok: false, error: "Nothing to reorder." };

  // Interactive rather than a batch: the delegate is resolved by name off the
  // transaction client, and a partially applied reorder would leave the list in
  // an order nobody chose.
  await prisma.$transaction(async (tx) => {
    const delegate = delegateFor(kind, tx as unknown as AnyClient);
    for (const [position, id] of ids.entries()) {
      await delegate.update({ where: { id }, data: { position } });
    }
  });

  await recordAudit({
    userId: session.user.id,
    action: `content.${kind}.reorder`,
    entity: entry.label,
    entityId: "*",
    after: { order: ids },
  });

  invalidate(kind);
  return { ok: true };
}

/* -------------------------------------------------------------- Banners */

const bannerSchema = z.object({
  placement: z.enum(["HERO", "PROMO_TILE", "WIDE"]),
  eyebrow: optionalText,
  /**
   * Optional, and stored as "" rather than null — the column is NOT NULL and
   * changing that is a migration for no gain.
   *
   * A banner is often just a photograph. Requiring a title meant an
   * image-only promo could not be saved at all, so the copy fields are the
   * optional layer over the image rather than the other way round.
   */
  title: z.string().trim().max(120).default(""),
  subtitle: optionalText,
  cta: optionalText,
  href: optionalText,
  /**
   * The model has carried these relations all along; the write path simply
   * never included them, so the admin had no way to attach artwork to a
   * banner it was otherwise able to create.
   */
  imageDesktopId: optionalText,
  imageMobileId: optionalText,
  /**
   * Chosen from how pale the *photograph* is, never from the app theme — a
   * light photo needs ink copy on a light scrim, whatever the site looks like.
   */
  tone: z.enum(["LIGHT", "DARK", "NONE"]),
  isActive: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export type BannerInput = z.input<typeof bannerSchema>;

export async function saveBanner(
  id: string | null,
  values: BannerInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission({ content: ["update"] });

  const parsed = bannerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: { endsAt: "The end date is before the start date." },
    };
  }

  try {
    const saved = id
      ? await prisma.banner.update({ where: { id }, data: d })
      : await prisma.banner.create({
          data: {
            ...d,
            position:
              ((
                await prisma.banner.findFirst({
                  where: { placement: d.placement },
                  orderBy: { position: "desc" },
                  select: { position: true },
                })
              )?.position ?? -1) + 1,
          },
        });

    await recordAudit({
      userId: session.user.id,
      action: id ? "content.banner.update" : "content.banner.create",
      entity: "Banner",
      entityId: saved.id,
      after: { title: saved.title, placement: saved.placement },
    });

    revalidateTag(tags.banners, "max");
    revalidatePath("/admin/content/banners");
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    console.error("saveBanner failed", e);
    return { ok: false, error: "Could not save the banner." };
  }
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  const session = await requirePermission({ content: ["delete"] });

  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "Banner not found." };

  await prisma.banner.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "content.banner.delete",
    entity: "Banner",
    entityId: id,
    before: { title: before.title, placement: before.placement },
  });

  revalidateTag(tags.banners, "max");
  revalidatePath("/admin/content/banners");
  return { ok: true };
}

export async function reorderBanners(ids: string[]): Promise<ActionResult> {
  const session = await requirePermission({ content: ["update"] });
  if (ids.length === 0) return { ok: false, error: "Nothing to reorder." };

  await prisma.$transaction(
    ids.map((id, position) =>
      prisma.banner.update({ where: { id }, data: { position } }),
    ),
  );

  await recordAudit({
    userId: session.user.id,
    action: "content.banner.reorder",
    entity: "Banner",
    entityId: "*",
    after: { order: ids },
  });

  revalidateTag(tags.banners, "max");
  revalidatePath("/admin/content/banners");
  return { ok: true };
}

/* --------------------------------------------------- Review screenshots */

const screenshotSchema = z.object({
  caption: optionalText,
  column: z.coerce.number().int().min(0).max(3),
  isActive: z.boolean(),
  consentObtained: z.boolean(),
});

/**
 * Screenshots of real customer messages.
 *
 * `consentObtained` is a hard gate, not a warning: these are photographs of
 * private conversations with named people, and publishing one without
 * permission is a problem no amount of social proof is worth. The action
 * refuses to set `isActive` while consent is unrecorded, so the only way to
 * publish is to tick consent deliberately and separately.
 */
export async function saveScreenshot(
  id: string,
  values: z.input<typeof screenshotSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ content: ["publish"] });

  const parsed = screenshotSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.isActive && !d.consentObtained) {
    return {
      ok: false,
      error:
        "Record consent before publishing. This is a screenshot of someone's private message.",
    };
  }

  await prisma.reviewScreenshot.update({ where: { id }, data: d });

  await recordAudit({
    userId: session.user.id,
    action: "content.screenshot.update",
    entity: "ReviewScreenshot",
    entityId: id,
    after: d as never,
  });

  revalidateTag(tags.screenshots, "max");
  revalidatePath("/admin/content/screenshots");
  return { ok: true };
}

export async function deleteScreenshot(id: string): Promise<ActionResult> {
  const session = await requirePermission({ content: ["delete"] });

  await prisma.reviewScreenshot.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "content.screenshot.delete",
    entity: "ReviewScreenshot",
    entityId: id,
  });

  revalidateTag(tags.screenshots, "max");
  revalidatePath("/admin/content/screenshots");
  return { ok: true };
}

/* -------------------------------------------------------------- Reviews */

const reviewSchema = z.object({
  id: z.string().min(1),
  isApproved: z.boolean(),
});

/**
 * Publish or unpublish a review.
 *
 * Both directions matter: a review that turns out to be abusive has to come
 * down as easily as a good one goes up, and unpublishing must reach the
 * product page's cached summary — which also feeds Google's `aggregateRating`,
 * so a stale one is a rating we are asserting publicly and no longer stand by.
 */
export async function setReviewApproved(
  input: z.input<typeof reviewSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ content: ["publish"] });

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, isApproved } = parsed.data;

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved },
    select: { productId: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: isApproved ? "content.review.approve" : "content.review.hide",
    entity: "Review",
    entityId: id,
    after: { isApproved },
  });

  revalidateTag(tags.reviews, "max");
  if (review.productId) {
    revalidateTag(tags.productReviews(review.productId), "max");
  }
  revalidatePath("/admin/content/reviews");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const session = await requirePermission({ content: ["delete"] });

  const review = await prisma.review.findUnique({
    where: { id },
    select: { productId: true, authorName: true },
  });
  if (!review) return { ok: false, error: "Review not found." };

  await prisma.review.delete({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "content.review.delete",
    entity: "Review",
    entityId: id,
    before: { authorName: review.authorName },
  });

  revalidateTag(tags.reviews, "max");
  if (review.productId) {
    revalidateTag(tags.productReviews(review.productId), "max");
  }
  revalidatePath("/admin/content/reviews");
  return { ok: true };
}
