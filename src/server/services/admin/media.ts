import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The media library.
 *
 * Uploading is not wired up yet — ImageKit was deliberately deferred — so this
 * screen's job is the other half: seeing what is in the library, fixing alt
 * text, and knowing which images are still the stand-ins the demo data shipped
 * with. `demoSource` is set on every one of those, which is what makes that
 * last question answerable rather than a manual audit of 170 files.
 */

export type MediaRow = {
  id: string;
  url: string;
  alt: string;
  folder: string | null;
  width: number | null;
  height: number | null;
  isDemo: boolean;
  /** Where it is actually used, so nothing is replaced blind. */
  usage: string[];
};

export type MediaFilters = {
  folder?: string;
  q?: string;
  /** Only the stand-ins still awaiting real artwork. */
  demoOnly?: boolean;
  page?: number;
};

const PAGE_SIZE = 24;

export async function listMedia(filters: MediaFilters = {}): Promise<{
  assets: MediaRow[];
  total: number;
  pageCount: number;
  folders: { folder: string; count: number; demoCount: number }[];
  demoTotal: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const q = filters.q?.trim() ?? "";

  const where = {
    ...(filters.folder ? { folder: filters.folder } : {}),
    ...(filters.demoOnly ? { demoSource: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { alt: { contains: q, mode: "insensitive" as const } },
            { url: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, grouped, demoGrouped, demoTotal] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    }),
    prisma.mediaAsset.groupBy({ by: ["folder"], _count: { _all: true } }),
    prisma.mediaAsset.groupBy({
      by: ["folder"],
      where: { demoSource: { not: null } },
      _count: { _all: true },
    }),
    prisma.mediaAsset.count({ where: { demoSource: { not: null } } }),
  ]);

  const demoByFolder = new Map(
    demoGrouped.map((g) => [g.folder ?? "", g._count._all]),
  );

  return {
    assets: rows.map((m) => ({
      id: m.id,
      url: m.url,
      alt: m.alt,
      folder: m.folder,
      width: m.width,
      height: m.height,
      isDemo: m.demoSource !== null,
      usage: [
        m._count.productImages && `${m._count.productImages} product`,
        m._count.categories && `${m._count.categories} category`,
        m._count.brands && `${m._count.brands} brand`,
        m._count.bannersDesktop + m._count.bannersMobile &&
          `${m._count.bannersDesktop + m._count.bannersMobile} banner`,
        m._count.screenshots && `${m._count.screenshots} screenshot`,
      ].filter((x): x is string => Boolean(x)),
    })),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    folders: grouped
      .map((g) => ({
        folder: g.folder ?? "",
        count: g._count._all,
        demoCount: demoByFolder.get(g.folder ?? "") ?? 0,
      }))
      .sort((a, b) => a.folder.localeCompare(b.folder)),
    demoTotal,
  };
}

/** Candidate images for a banner slot, newest first. */
export async function listBannerImageOptions(): Promise<
  { id: string; url: string; alt: string }[]
> {
  // Deliberately not filtered to `folder: "banners"`.
  //
  // It was, and that quietly broke the obvious workflow: upload artwork on the
  // Media screen, come to Banners, and it is not in the list — because Media
  // had filed it elsewhere. A banner can legitimately reuse a product shot or
  // a campaign image, so the folder is a hint about where new uploads *land*,
  // not a rule about what may be chosen.
  const rows = await prisma.mediaAsset.findMany({
    orderBy: [{ folder: "asc" }, { createdAt: "desc" }],
    select: { id: true, url: true, alt: true },
    take: 200,
  });
  return rows;
}
