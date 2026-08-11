import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";

/**
 * Settings and small merchandising lists.
 *
 * Settings are stored one row per logical group so editing contact details
 * cannot clobber commerce rules. Each getter falls back to the shipped default
 * when its row is missing — a fresh database, or a group an admin has never
 * touched, must still render a working storefront rather than a blank page.
 */

async function readGroup<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
}

export type StoreStats = {
  ratingAverage: number;
  ratingCount: number;
  ordersDelivered: number;
  happyCustomers: number;
  districtsCovered: number;
};

const STORE_STATS_FALLBACK: StoreStats = {
  ratingAverage: 4.8,
  ratingCount: 12480,
  ordersDelivered: 96000,
  happyCustomers: 42000,
  districtsCovered: 64,
};

/** Drives the trust bar and the Organization JSON-LD aggregateRating. */
export async function getStoreStats(): Promise<StoreStats> {
  "use cache";
  cacheTag(tags.settings, tags.setting("seo"));
  cacheLife("days");

  return readGroup("seo", STORE_STATS_FALLBACK);
}

export async function getTrendingSearches(): Promise<string[]> {
  "use cache";
  cacheTag(tags.trending);
  // Hours, not days: the list now moves with real traffic, and searches are
  // deliberately not invalidating this tag on every hit — the shorter life is
  // what lets it keep up without a write amplifying into a cache purge.
  cacheLife("hours");

  // Terms not searched within this window stop counting toward what is
  // trending *now* — otherwise last winter's hit crowds out this week's.
  const TRENDING_WINDOW_DAYS = 30;
  const since = new Date();
  since.setDate(since.getDate() - TRENDING_WINDOW_DAYS);

  // Pinned terms first, in the order staff arranged them, then whatever
  // shoppers are actually searching for right now. A pinned term is a
  // deliberate choice — a new campaign nobody has searched for yet — so it must
  // not have to out-rank real traffic to appear.
  const [pinned, popular] = await Promise.all([
    prisma.trendingSearch.findMany({
      where: { isActive: true, isPinned: true },
      orderBy: { position: "asc" },
      select: { term: true },
    }),
    prisma.trendingSearch.findMany({
      where: {
        isActive: true,
        isPinned: false,
        hits: { gt: 0 },
        // Scoped to a recent window so last winter's hit does not crowd out
        // this week's.
        lastSeenAt: { gte: since },
      },
      orderBy: [{ hits: "desc" }, { lastSeenAt: "desc" }],
      take: 8,
      select: { term: true },
    }),
  ]);

  const terms = [...pinned, ...popular].map((r) => r.term);

  // A brand-new shop has no traffic yet. Rather than show nothing, fall back to
  // any hand-written rows that were never pinned — which is exactly what the
  // list used to be before it learned to count.
  if (terms.length === 0) {
    const seeded = await prisma.trendingSearch.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: 8,
      select: { term: true },
    });
    return seeded.map((r) => r.term);
  }

  return terms.slice(0, 8);
}

/**
 * Announcement bar messages. Scheduling is honoured here rather than in the
 * component, so a campaign can be queued in advance and simply appear.
 */
export async function getAnnouncements(): Promise<string[]> {
  "use cache";
  cacheTag(tags.announcements);
  cacheLife("hours");

  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { position: "asc" },
    select: { text: true },
  });
  return rows.map((r) => r.text);
}

/* ------------------------------------------------------------------ Groups */

export type SiteSettings = {
  name: string;
  legalName: string;
  tagline: string;
  shortDescription: string;
  description: string;
  url: string;
  logo: string;
  locale: string;
  country: string;
  currency: string;
  currencySymbol: string;
};

export type ContactSettings = {
  whatsapp: string;
  whatsappDigits: string;
  /** Prefilled wa.me link, derived so it can never drift from the number. */
  whatsappUrl: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: string;
};

export type CommerceSettings = {
  freeShippingThreshold: number;
  returnWindowDays: number;
  codAvailable: boolean;
  maxQtyPerLine: number;
  lowStockThreshold: number;
  orderNumberPrefix: string;
};

export type SocialSettings = { facebook: string; instagram: string };

/**
 * Defaults mirror what shipped in `src/lib/site.ts`. They are the fallback for
 * a database that has never been seeded — the storefront must render something
 * sane rather than crash on a missing row.
 */
const SITE_FALLBACK: SiteSettings = {
  name: "FlexOver BD",
  legalName: "FlexOver BD",
  tagline: "Everything you need, delivered better.",
  shortDescription: "Your Trusted Online Shopping Destination",
  description:
    "Shop fashion, gadgets, home essentials, beauty and more at FlexOver BD. Fast delivery across Bangladesh, cash on delivery available, and 100% authentic products.",
  url: "https://www.flexoverbd.com",
  logo: "/icon.jpg",
  locale: "en_BD",
  country: "Bangladesh",
  currency: "BDT",
  currencySymbol: "৳",
};

const CONTACT_FALLBACK: ContactSettings = {
  whatsapp: "+8801738121614",
  whatsappDigits: "8801738121614",
  whatsappUrl: "https://wa.me/8801738121614",
  phoneDisplay: "+880 1738-121614",
  phoneHref: "tel:+8801738121614",
  email: "support@flexoverbd.com",
  address: "Dhaka, Bangladesh",
  hours: "Sat–Thu, 10:00 AM – 8:00 PM",
};

const COMMERCE_FALLBACK: CommerceSettings = {
  freeShippingThreshold: 2000,
  returnWindowDays: 7,
  codAvailable: true,
  maxQtyPerLine: 10,
  lowStockThreshold: 20,
  orderNumberPrefix: "FB-",
};

const SOCIAL_FALLBACK: SocialSettings = {
  facebook: "https://www.facebook.com/flexoverbd",
  instagram: "https://instagram.com/flexoverbd",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(tags.settings, tags.setting("site"));
  cacheLife("days");
  return readGroup("site", SITE_FALLBACK);
}

export async function getContactSettings(): Promise<ContactSettings> {
  "use cache";
  cacheTag(tags.settings, tags.setting("contact"));
  cacheLife("days");

  const c = await readGroup("contact", CONTACT_FALLBACK);
  // Derived forms are computed rather than stored, so an admin only ever edits
  // the number once and the tel:/wa.me links cannot drift out of sync with it.
  const digits = c.whatsapp.replace(/\D/g, "");
  return {
    ...c,
    whatsappDigits: digits,
    whatsappUrl: `https://wa.me/${digits}?text=${encodeURIComponent(
      "Hi FlexOver BD! I'd like to know more about an order.",
    )}`,
    phoneHref: `tel:${c.whatsapp.startsWith("+") ? c.whatsapp : `+${digits}`}`,
  };
}

export async function getCommerceSettings(): Promise<CommerceSettings> {
  "use cache";
  cacheTag(tags.settings, tags.setting("commerce"));
  cacheLife("days");
  return readGroup("commerce", COMMERCE_FALLBACK);
}

export async function getSocialSettings(): Promise<SocialSettings> {
  "use cache";
  cacheTag(tags.settings, tags.setting("social"));
  cacheLife("days");
  return readGroup("social", SOCIAL_FALLBACK);
}

export type ZoneSettings = {
  id: string;
  name: string;
  fee: number;
  etaLabel: string;
  /** True for the zone Dhaka district belongs to — drives the inside/outside copy. */
  isInsideDhaka: boolean;
};

/**
 * Delivery zones as the storefront needs them.
 *
 * The checkout preview quotes a fee before an order exists, so it needs the
 * same numbers `placeOrder` will charge. Reading them from here rather than a
 * constant is what keeps the quote and the charge in agreement.
 */
export async function getDeliveryZones(): Promise<ZoneSettings[]> {
  "use cache";
  cacheTag(tags.delivery, tags.settings);
  cacheLife("days");

  const rows = await prisma.deliveryZone.findMany({
    include: { districts: { where: { name: "Dhaka" }, select: { id: true } } },
    orderBy: { position: "asc" },
  });

  return rows.map((z) => ({
    id: z.id,
    name: z.name,
    fee: z.fee,
    etaLabel: z.etaLabel,
    isInsideDhaka: z.districts.length > 0,
  }));
}

/**
 * The two zones the storefront's copy talks about by name.
 *
 * Most surfaces ("delivered in 1–2 days inside Dhaka") only need these two, and
 * they should not each re-derive the find/fallback dance. Fallbacks cover an
 * unseeded database rather than an admin deleting a zone — the admin UI does
 * not offer deletion.
 */
export async function getZonePair(): Promise<{
  inside: ZoneSettings;
  outside: ZoneSettings;
}> {
  const zones = await getDeliveryZones();
  return {
    inside: zones.find((z) => z.isInsideDhaka) ?? {
      id: "inside-dhaka",
      name: "Inside Dhaka",
      fee: 70,
      etaLabel: "1–2 days",
      isInsideDhaka: true,
    },
    outside: zones.find((z) => !z.isInsideDhaka) ?? {
      id: "outside-dhaka",
      name: "Outside Dhaka",
      fee: 130,
      etaLabel: "2–4 days",
      isInsideDhaka: false,
    },
  };
}

/** Everything the storefront's client components need, in one round trip. */
export async function getStorefrontSettings() {
  const [site, contact, commerce, social, zones] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
    getCommerceSettings(),
    getSocialSettings(),
    getDeliveryZones(),
  ]);
  return { site, contact, commerce, social, zones };
}

export type StorefrontSettings = Awaited<
  ReturnType<typeof getStorefrontSettings>
>;
