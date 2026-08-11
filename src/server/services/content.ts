import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import type { Banner, PromoTile } from "@/data/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";
import { tags } from "@/server/cache-tags";
import {
  getCommerceSettings,
  getContactSettings,
  getZonePair,
} from "@/server/services/settings";

/**
 * Merchandising content: hero banners, promo tiles, the wide banner.
 *
 * Scheduling is applied here rather than in the components, so a campaign can
 * be queued days ahead and simply appear — and, more importantly, disappear on
 * time without anyone remembering to unpublish it.
 */

export const CONTENT_TOKENS = [
  "freeDeliveryOver",
  "returnWindowDays",
  "insideDhakaFee",
  "outsideDhakaFee",
  "insideDhakaEta",
  "outsideDhakaEta",
  "phone",
  "email",
] as const;

async function contentTokens(): Promise<Record<string, string>> {
  const [commerce, contact, zones] = await Promise.all([
    getCommerceSettings(),
    getContactSettings(),
    getZonePair(),
  ]);

  return {
    freeDeliveryOver: formatBDT(commerce.freeShippingThreshold),
    returnWindowDays: String(commerce.returnWindowDays),
    insideDhakaFee: formatBDT(zones.inside.fee),
    outsideDhakaFee: formatBDT(zones.outside.fee),
    insideDhakaEta: zones.inside.etaLabel,
    outsideDhakaEta: zones.outside.etaLabel,
    phone: contact.phoneDisplay,
    email: contact.email,
  };
}

function interpolate(text: string, values: Record<string, string>) {
  // An unknown token is left verbatim rather than blanked: a visible
  // "{{typo}}" gets reported and fixed, an empty gap reads as finished copy.
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key) => values[key] ?? whole);
}

const bannerInclude = {
  imageDesktop: true,
  imageMobile: true,
} satisfies Prisma.BannerInclude;

type BannerRow = Prisma.BannerGetPayload<{ include: typeof bannerInclude }>;

function liveWindow(now: Date) {
  return {
    isActive: true,
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
  };
}

function toAsset(
  media: BannerRow["imageDesktop"],
  alt: string,
  w: number,
  h: number,
) {
  return {
    src: media?.url ?? "",
    alt: media?.alt || alt,
    width: media?.width ?? w,
    height: media?.height ?? h,
    prompt: "",
  };
}

/**
 * Banner copy is interpolated too. "Free delivery over ৳2,000" as a literal
 * banner title is the single most likely thing on the site to go stale — it is
 * written once during a campaign and nobody thinks of it again when the
 * threshold moves.
 */
async function bannersFor(placement: "HERO" | "PROMO_TILE" | "WIDE") {
  "use cache";
  cacheTag(tags.banners);
  cacheLife("hours");

  return prisma.banner.findMany({
    where: { placement, ...liveWindow(new Date()) },
    include: bannerInclude,
    orderBy: { position: "asc" },
  });
}

export async function getHeroBanners(): Promise<Banner[]> {
  const [rows, t] = await Promise.all([bannersFor("HERO"), contentTokens()]);

  return rows.map((b) => ({
    id: b.id,
    eyebrow: b.eyebrow ? interpolate(b.eyebrow, t) : undefined,
    title: interpolate(b.title, t),
    subtitle: interpolate(b.subtitle ?? "", t),
    cta: b.cta ?? "",
    href: b.href ?? "/",
    tone: b.tone === "DARK" ? "dark" : b.tone === "NONE" ? "none" : "light",
    // Two crops per banner: the copy sits at the bottom on phones and on the
    // left from sm up, so one image cannot serve both.
    imageMobile: toAsset(b.imageMobile ?? b.imageDesktop, b.title, 900, 1200),
    imageDesktop: toAsset(b.imageDesktop, b.title, 1920, 800),
  }));
}

function toPromoTile(b: BannerRow, t: Record<string, string>): PromoTile {
  return {
    id: b.id,
    title: interpolate(b.title, t),
    subtitle: interpolate(b.subtitle ?? "", t),
    cta: b.cta ?? "",
    href: b.href ?? "/",
    tone: b.tone === "DARK" ? "dark" : b.tone === "NONE" ? "none" : "light",
    image: toAsset(b.imageDesktop, b.title, 800, 800),
  };
}

export async function getPromoTiles(): Promise<PromoTile[]> {
  const [rows, t] = await Promise.all([
    bannersFor("PROMO_TILE"),
    contentTokens(),
  ]);
  return rows.map((b) => toPromoTile(b, t));
}

export async function getWideBanner(): Promise<PromoTile | null> {
  const [rows, t] = await Promise.all([bannersFor("WIDE"), contentTokens()]);
  return rows[0] ? toPromoTile(rows[0], t) : null;
}

/* ------------------------------------------------------------ Editorial */

/**
 * Tokens an admin can drop into editorial copy.
 *
 * Without these, the first FAQ answer anyone writes hardcodes "free over
 * ৳2,000" and quietly contradicts the commerce settings the day someone
 * changes the threshold — exactly what the seeded announcement used to do.
 * Interpolating at read time means the copy is written once and stays true.
 */
export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  group: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

async function getFaqRows() {
  "use cache";
  cacheTag(tags.faq);
  cacheLife("days");

  return prisma.faqItem.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      question: true,
      answer: true,
      group: true,
      ctaLabel: true,
      ctaHref: true,
    },
  });
}

export async function getFaqEntries(): Promise<FaqEntry[]> {
  // Interpolation sits outside the cached read so the settings it pulls in
  // stay live: caching the *rendered* copy would freeze a threshold change
  // behind the FAQ's own tag.
  const [rows, values] = await Promise.all([getFaqRows(), contentTokens()]);
  return rows.map((r) => ({
    ...r,
    question: interpolate(r.question, values),
    answer: interpolate(r.answer, values),
  }));
}

export type TrustEntry = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
};

async function getTrustRows() {
  "use cache";
  cacheTag(tags.trustItems);
  cacheLife("days");

  return prisma.trustItem.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, icon: true, title: true, subtitle: true },
  });
}

export async function getTrustItems(): Promise<TrustEntry[]> {
  const [rows, values] = await Promise.all([getTrustRows(), contentTokens()]);
  return rows.map((r) => ({
    id: r.id,
    icon: r.icon,
    title: interpolate(r.title, values),
    subtitle: interpolate(r.subtitle ?? "", values),
  }));
}

/** Mirrors the `NavGroup` enum — the four places a link can be placed. */
export type NavGroupKey =
  | "FOOTER_HELP"
  | "FOOTER_COMPANY"
  | "MOBILE_SHORTCUT"
  | "MOBILE_HELP";

export type NavEntry = {
  id: string;
  label: string;
  href: string;
  /** lucide-react icon name; only the mobile shortcut tiles render one. */
  icon: string | null;
};

async function getNavRows(group: NavGroupKey) {
  "use cache";
  cacheTag(tags.navLinks);
  cacheLife("days");

  return prisma.navLink.findMany({
    where: { group, isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, label: true, href: true, icon: true },
  });
}

export async function getNavLinks(group: NavGroupKey): Promise<NavEntry[]> {
  const [rows, values] = await Promise.all([
    getNavRows(group),
    contentTokens(),
  ]);
  return rows.map((r) => ({ ...r, label: interpolate(r.label, values) }));
}

export type ScreenshotEntry = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  column: number;
  width: number;
  height: number;
};

/**
 * The customer-message wall.
 *
 * Filtered on `consentObtained` as well as `isActive`, and deliberately so:
 * these are photographs of named people's private conversations, and the
 * section next to them tells visitors that every one was shared with
 * permission. That sentence has to be *true*, so the query is what makes it
 * true rather than the copy claiming it.
 *
 * An empty result is a normal state, not an error — the homepage drops the wall
 * and the claim together rather than filling the space with something invented.
 */
export async function getReviewScreenshots(): Promise<ScreenshotEntry[]> {
  "use cache";
  cacheTag(tags.screenshots);
  cacheLife("hours");

  const rows = await prisma.reviewScreenshot.findMany({
    where: { isActive: true, consentObtained: true },
    orderBy: [{ column: "asc" }, { position: "asc" }],
    include: {
      media: { select: { url: true, alt: true, width: true, height: true } },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    url: s.media.url,
    alt: s.media.alt,
    caption: s.caption ?? "",
    column: s.column,
    width: s.media.width ?? 299,
    height: s.media.height ?? 668,
  }));
}
