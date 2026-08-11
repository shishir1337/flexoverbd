import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Admin reads for editorial content.
 *
 * Uncached like the rest of the admin: a draft announcement or an inactive FAQ
 * entry must be visible here and nowhere else, and someone who just saved a row
 * needs to see it rather than a cached list from before their edit.
 *
 * Dates cross to the client as ISO strings. The list components are Client
 * Components, and a `Date` that survives serialisation only to be reformatted
 * on the client is how a schedule ends up displayed in the visitor's timezone
 * instead of the store's.
 */

export type ContentRow = {
  id: string;
  position: number;
  isActive: boolean;
  fields: Record<string, string | boolean | number | null>;
};

export async function listAnnouncements(): Promise<ContentRow[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: { position: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    isActive: r.isActive,
    fields: {
      text: r.text,
      startsAt: r.startsAt?.toISOString().slice(0, 10) ?? "",
      endsAt: r.endsAt?.toISOString().slice(0, 10) ?? "",
    },
  }));
}

export async function listTrendingSearches(): Promise<ContentRow[]> {
  const rows = await prisma.trendingSearch.findMany({
    orderBy: { position: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    isActive: r.isActive,
    fields: { term: r.term },
  }));
}

export async function listFaqItems(): Promise<ContentRow[]> {
  const rows = await prisma.faqItem.findMany({ orderBy: { position: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    isActive: r.isActive,
    fields: {
      question: r.question,
      answer: r.answer,
      group: r.group ?? "",
      ctaLabel: r.ctaLabel ?? "",
      ctaHref: r.ctaHref ?? "",
    },
  }));
}

export async function listTrustItems(): Promise<ContentRow[]> {
  const rows = await prisma.trustItem.findMany({
    orderBy: { position: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    isActive: r.isActive,
    fields: { icon: r.icon, title: r.title, subtitle: r.subtitle ?? "" },
  }));
}

export async function listNavLinks(): Promise<ContentRow[]> {
  const rows = await prisma.navLink.findMany({
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    isActive: r.isActive,
    fields: {
      group: r.group,
      label: r.label,
      href: r.href,
      icon: r.icon ?? "",
    },
  }));
}

export type BannerRow = {
  id: string;
  placement: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  cta: string;
  href: string;
  tone: string;
  position: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  desktopUrl: string | null;
  mobileUrl: string | null;
  desktopId: string;
  mobileId: string;
};

export async function listBanners(): Promise<BannerRow[]> {
  const rows = await prisma.banner.findMany({
    orderBy: [{ placement: "asc" }, { position: "asc" }],
    include: {
      imageDesktop: { select: { id: true, url: true } },
      imageMobile: { select: { id: true, url: true } },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    placement: b.placement,
    title: b.title,
    eyebrow: b.eyebrow ?? "",
    subtitle: b.subtitle ?? "",
    cta: b.cta ?? "",
    href: b.href ?? "",
    tone: b.tone,
    position: b.position,
    isActive: b.isActive,
    startsAt: b.startsAt?.toISOString().slice(0, 10) ?? "",
    endsAt: b.endsAt?.toISOString().slice(0, 10) ?? "",
    desktopUrl: b.imageDesktop?.url ?? null,
    mobileUrl: b.imageMobile?.url ?? null,
    // Empty string, not null: these feed <select> values, and an unset select
    // is "" — mapping null to "" here keeps that conversion in one place.
    desktopId: b.imageDesktopId ?? "",
    mobileId: b.imageMobileId ?? "",
  }));
}

export type ScreenshotRow = {
  id: string;
  url: string;
  caption: string;
  column: number;
  position: number;
  isActive: boolean;
  consentObtained: boolean;
};

export async function listReviewScreenshots(): Promise<ScreenshotRow[]> {
  const rows = await prisma.reviewScreenshot.findMany({
    orderBy: [{ column: "asc" }, { position: "asc" }],
    include: { media: { select: { url: true } } },
  });
  return rows.map((s) => ({
    id: s.id,
    url: s.media.url,
    caption: s.caption ?? "",
    column: s.column,
    position: s.position,
    isActive: s.isActive,
    consentObtained: s.consentObtained,
  }));
}

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  updatedAt: string;
};

export async function listPages(): Promise<PageRow[]> {
  const rows = await prisma.page.findMany({ orderBy: { slug: "asc" } });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    isPublished: p.isPublished,
    updatedAt: p.updatedAt.toISOString().slice(0, 10),
  }));
}

export type AdminReviewRow = {
  id: string;
  productTitle: string;
  productSlug: string | null;
  authorName: string;
  location: string;
  rating: number;
  body: string;
  isApproved: boolean;
  /** Backed by a real delivered order rather than a claim in the copy. */
  isVerified: boolean;
  createdAt: string;
};

/**
 * Reviews awaiting moderation, and those already published.
 *
 * Unapproved first: this screen exists to clear a queue, and something waiting
 * on a decision should not be below fifty things that already have one.
 */
export async function listReviews(): Promise<AdminReviewRow[]> {
  const rows = await prisma.review.findMany({
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { product: { select: { title: true, slug: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    productTitle: r.product?.title ?? "Deleted product",
    productSlug: r.product?.slug ?? null,
    authorName: r.authorName,
    location: r.location ?? "",
    rating: r.rating,
    body: r.body,
    isApproved: r.isApproved,
    isVerified: r.isVerified,
    createdAt: r.createdAt.toISOString().slice(0, 10),
  }));
}
