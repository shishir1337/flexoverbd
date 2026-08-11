/**
 * Seed: migrates the hand-authored demo data in src/data/* into Postgres.
 *
 * Idempotent and re-runnable — every write is an upsert keyed on a natural
 * unique (slug, name, code). Running it twice changes nothing; running it after
 * an admin has edited a record will overwrite that record, so it is a
 * development/staging tool, not something to point at production once the
 * client starts editing.
 *
 *   pnpm db:seed
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { heroBanners, promoTiles, wideBanner } from "../src/data/banners.ts";
import { categories } from "../src/data/categories.ts";
import { divisions, zoneForDistrict } from "../src/data/districts.ts";
import { products } from "../src/data/products.ts";
import { reviews, storeStats } from "../src/data/reviews.ts";
import type { ImageAsset, Product } from "../src/data/types.ts";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PUBLIC_DIR = join(process.cwd(), "public");
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"];

/** Mirrors resolvePublicImage(): find the file whatever extension it landed as. */
function resolveOnDisk(src: string): string | null {
  const dot = src.lastIndexOf(".");
  const base = dot === -1 ? src : src.slice(0, dot);
  for (const ext of [src.slice(dot), ...IMAGE_EXTS]) {
    const candidate = `${base}${ext}`;
    if (existsSync(join(PUBLIC_DIR, candidate))) return candidate;
  }
  return null;
}

/**
 * Media rows point at `public/` paths for now. ImageKit is Phase 2: when it
 * lands only `url` and `imagekitId` change, and nothing downstream moves.
 */
async function upsertMedia(asset: ImageAsset, folder: string) {
  const onDisk = resolveOnDisk(asset.src) ?? asset.src;
  const existing = await prisma.mediaAsset.findFirst({
    where: { url: onDisk },
  });
  if (existing) return existing;

  return prisma.mediaAsset.create({
    data: {
      url: onDisk,
      alt: asset.alt,
      width: asset.width,
      height: asset.height,
      folder,
      demoSource: asset.demoSource ?? null,
    },
  });
}

/** Gallery-by-convention: <slug>.jpg, then -2, -3, -4 if present on disk. */
function galleryPaths(primary: ImageAsset): ImageAsset[] {
  const dot = primary.src.lastIndexOf(".");
  const base = dot === -1 ? primary.src : primary.src.slice(0, dot);
  const ext = dot === -1 ? ".jpg" : primary.src.slice(dot);

  const out: ImageAsset[] = [primary];
  for (let i = 2; i <= 4; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (resolveOnDisk(candidate)) {
      out.push({
        ...primary,
        src: candidate,
        alt: `${primary.alt} — view ${i}`,
      });
    }
  }
  return out;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const BADGE = {
  new: "NEW",
  bestseller: "BESTSELLER",
  limited: "LIMITED",
  restock: "RESTOCK",
} as const;

const SIZE_SYSTEM = {
  apparel: "APPAREL",
  footwear: "FOOTWEAR",
  onesize: "ONESIZE",
} as const;

/**
 * Explodes the frontend's colour[] × size[] arrays into one row per sellable
 * combination. A product with neither still gets exactly one variant, so stock
 * and SKU have a single code path everywhere downstream.
 *
 * The product-level `stock` number is spread across the combinations rather
 * than duplicated — 46 units of a shirt is 46 in total, not 46 per size.
 */
function buildVariants(p: Product) {
  const colours = p.colors?.length ? p.colors : [null];
  const sizes = p.sizes?.options.length ? p.sizes.options : [null];

  const combos = colours.flatMap((c) => sizes.map((s) => ({ c, s })));
  const base = Math.floor(p.stock / combos.length);
  const remainder = p.stock % combos.length;

  return combos.map(({ c, s }, i) => {
    const parts = [p.id.toUpperCase()];
    if (c) parts.push(slugify(c.name).toUpperCase());
    if (s) parts.push(slugify(s.value).toUpperCase());

    const soldOut = c?.inStock === false || s?.inStock === false;

    return {
      sku: parts.join("-"),
      colourName: c?.name ?? null,
      colourHex: c?.hex ?? null,
      sizeValue: s?.value ?? null,
      sizeLabel: s?.label ?? null,
      sizeSystem: p.sizes ? SIZE_SYSTEM[p.sizes.system] : null,
      // A sold-out colour or size carries zero units regardless of the split.
      stock: soldOut ? 0 : base + (i < remainder ? 1 : 0),
      isActive: true,
      position: i,
    };
  });
}

async function seedDelivery() {
  const inside = await prisma.deliveryZone.upsert({
    where: { name: "Inside Dhaka" },
    update: { fee: 70, etaLabel: "1–2 days", position: 0 },
    create: {
      name: "Inside Dhaka",
      fee: 70,
      etaLabel: "1–2 days",
      position: 0,
    },
  });
  const outside = await prisma.deliveryZone.upsert({
    where: { name: "Outside Dhaka" },
    update: { fee: 130, etaLabel: "2–4 days", position: 1 },
    create: {
      name: "Outside Dhaka",
      fee: 130,
      etaLabel: "2–4 days",
      position: 1,
    },
  });

  let districts = 0;
  for (const division of divisions) {
    const div = await prisma.division.upsert({
      where: { name: division.name },
      update: {},
      create: { name: division.name },
    });

    for (const name of division.districts) {
      const zoneId =
        zoneForDistrict(name) === "inside-dhaka" ? inside.id : outside.id;
      await prisma.district.upsert({
        where: { name },
        update: { divisionId: div.id, zoneId },
        create: { name, divisionId: div.id, zoneId },
      });
      districts++;
    }
  }
  console.log(`  divisions ${divisions.length} · districts ${districts}`);
}

async function seedSettings() {
  const groups: Record<string, unknown> = {
    site: {
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
    },
    contact: {
      whatsapp: "+8801738121614",
      whatsappDigits: "8801738121614",
      phoneDisplay: "+880 1738-121614",
      phoneHref: "tel:+8801738121614",
      email: "support@flexoverbd.com",
      address: "Dhaka, Bangladesh",
      hours: "Sat–Thu, 10:00 AM – 8:00 PM",
    },
    social: {
      facebook: "https://www.facebook.com/flexoverbd",
      instagram: "https://instagram.com/flexoverbd",
    },
    commerce: {
      freeShippingThreshold: 2000,
      returnWindowDays: 7,
      codAvailable: true,
      maxQtyPerLine: 10,
      lowStockThreshold: 20,
      orderNumberPrefix: "FB-",
    },
    payments: [
      {
        slug: "cod",
        name: "Cash on Delivery",
        wordmark: "COD",
        color: "#0e9f6e",
        enabled: true,
      },
      {
        slug: "bkash",
        name: "bKash",
        wordmark: "bKash",
        color: "#e2136e",
        enabled: true,
      },
      {
        slug: "nagad",
        name: "Nagad",
        wordmark: "Nagad",
        color: "#f26522",
        enabled: true,
      },
      {
        slug: "rocket",
        name: "Rocket",
        wordmark: "Rocket",
        color: "#8c3494",
        enabled: true,
      },
      {
        slug: "visa",
        name: "Visa",
        wordmark: "VISA",
        color: "#1a1f71",
        enabled: true,
      },
      {
        slug: "mastercard",
        name: "Mastercard",
        wordmark: "Mastercard",
        color: "#eb001b",
        enabled: true,
      },
    ],
    seo: {
      ratingAverage: storeStats.ratingAverage,
      ratingCount: storeStats.ratingCount,
      ordersDelivered: storeStats.ordersDelivered,
      happyCustomers: storeStats.happyCustomers,
      districtsCovered: storeStats.districtsCovered,
    },
  };

  for (const [key, value] of Object.entries(groups)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }
  console.log(`  settings groups ${Object.keys(groups).length}`);
}

async function seedCatalogue() {
  // Categories + subcategories
  for (const [i, c] of categories.entries()) {
    const media = await upsertMedia(c.image, "categories");
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        shortName: c.shortName,
        blurb: c.blurb,
        tint: c.tint,
        imageId: media.id,
        position: i,
      },
      create: {
        slug: c.slug,
        name: c.name,
        shortName: c.shortName,
        blurb: c.blurb,
        tint: c.tint,
        imageId: media.id,
        position: i,
      },
    });

    for (const [j, sub] of c.subcategories.entries()) {
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: cat.id, slug: sub.slug } },
        update: { name: sub.name, position: j },
        create: {
          categoryId: cat.id,
          slug: sub.slug,
          name: sub.name,
          position: j,
        },
      });
    }
  }
  console.log(`  categories ${categories.length}`);

  // Brands, derived from the distinct brand strings on products.
  const brandNames = [...new Set(products.map((p) => p.brand))];
  const brandBySlug = new Map<string, string>();
  for (const name of brandNames) {
    const slug = slugify(name);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
    brandBySlug.set(slug, brand.id);
  }
  console.log(`  brands ${brandNames.length}`);

  // Products + variants + images
  let variantCount = 0;
  let imageCount = 0;

  for (const p of products) {
    const cat = await prisma.category.findUniqueOrThrow({
      where: { slug: p.category },
    });
    const sub = await prisma.subcategory.findFirst({
      where: { categoryId: cat.id, name: p.subcategory },
    });

    const data = {
      title: p.title,
      brandId: brandBySlug.get(slugify(p.brand)) ?? null,
      categoryId: cat.id,
      subcategoryId: sub?.id ?? null,
      price: p.price,
      compareAt: p.compareAt ?? null,
      badge: p.badge ? BADGE[p.badge] : null,
      freeDelivery: p.freeDelivery,
      tags: p.tags,
      ratingAvg: p.rating,
      reviewCount: p.reviewCount,
      soldCount: p.sold,
      isActive: true,
      publishedAt: new Date(),
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    // Variants — replaced wholesale so re-seeding cannot leave orphans behind.
    await prisma.productVariant.deleteMany({
      where: { productId: product.id },
    });
    const variants = buildVariants(p);
    await prisma.productVariant.createMany({
      data: variants.map((v) => ({ ...v, productId: product.id })),
    });
    variantCount += variants.length;

    // Images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const [i, asset] of galleryPaths(p.image).entries()) {
      const media = await upsertMedia(asset, "products");
      await prisma.productImage.create({
        data: {
          productId: product.id,
          mediaId: media.id,
          alt: asset.alt,
          position: i,
        },
      });
      imageCount++;
    }
  }
  console.log(
    `  products ${products.length} · variants ${variantCount} · images ${imageCount}`,
  );

  // Flash sale: the frontend's inline `flash` becomes a scheduled campaign.
  const flashProducts = products.filter((p) => p.flash);
  if (flashProducts.length) {
    const endsAt = new Date();
    endsAt.setHours(23, 59, 59, 0);

    const campaign = await prisma.flashSaleCampaign.upsert({
      where: { id: "seed-flash-campaign" },
      update: { endsAt, isActive: true },
      create: {
        id: "seed-flash-campaign",
        name: "Today's Flash Sale",
        startsAt: new Date(),
        endsAt,
        isActive: true,
      },
    });

    for (const p of flashProducts) {
      const product = await prisma.product.findUniqueOrThrow({
        where: { slug: p.slug },
      });
      await prisma.flashSaleItem.upsert({
        where: {
          campaignId_productId: {
            campaignId: campaign.id,
            productId: product.id,
          },
        },
        update: {
          salePrice: p.flash?.price ?? p.price,
          claimed: p.flash?.claimedPercent ?? 0,
        },
        create: {
          campaignId: campaign.id,
          productId: product.id,
          salePrice: p.flash?.price ?? p.price,
          stockCap: 100,
          claimed: p.flash?.claimedPercent ?? 0,
        },
      });
    }
    console.log(`  flash sale items ${flashProducts.length}`);
  }
}

async function seedMerchandising() {
  await prisma.banner.deleteMany({});

  for (const [i, b] of heroBanners.entries()) {
    const desktop = await upsertMedia(b.imageDesktop, "banners");
    const mobile = await upsertMedia(b.imageMobile, "banners");
    await prisma.banner.create({
      data: {
        placement: "HERO",
        eyebrow: b.eyebrow ?? null,
        title: b.title,
        subtitle: b.subtitle,
        cta: b.cta,
        href: b.href,
        tone: b.tone === "dark" ? "DARK" : "LIGHT",
        imageDesktopId: desktop.id,
        imageMobileId: mobile.id,
        position: i,
      },
    });
  }

  for (const [i, t] of promoTiles.entries()) {
    const media = await upsertMedia(t.image, "banners");
    await prisma.banner.create({
      data: {
        placement: "PROMO_TILE",
        title: t.title,
        subtitle: t.subtitle,
        cta: t.cta,
        href: t.href,
        tone: t.tone === "dark" ? "DARK" : "LIGHT",
        imageDesktopId: media.id,
        position: i,
      },
    });
  }

  const wideMedia = await upsertMedia(wideBanner.image, "banners");
  await prisma.banner.create({
    data: {
      placement: "WIDE",
      title: wideBanner.title,
      subtitle: wideBanner.subtitle,
      cta: wideBanner.cta,
      href: wideBanner.href,
      tone: wideBanner.tone === "dark" ? "DARK" : "LIGHT",
      imageDesktopId: wideMedia.id,
      position: 0,
    },
  });
  console.log(`  banners ${heroBanners.length + promoTiles.length + 1}`);

  // Deliberately free of figures. Announcements are plain text an admin edits
  // by hand, so a seeded "free delivery over ৳2,000" would silently contradict
  // the commerce settings the moment someone changed the threshold.
  const announcements = [
    "Free delivery on qualifying orders",
    "Cash on delivery available in all 64 districts",
    "Easy returns — no questions asked",
    "100% authentic products, sourced directly",
  ];
  for (const [i, text] of announcements.entries()) {
    const existing = await prisma.announcement.findFirst({ where: { text } });
    if (existing) {
      await prisma.announcement.update({
        where: { id: existing.id },
        data: { position: i, isActive: true },
      });
    } else {
      await prisma.announcement.create({
        data: { text, position: i, isActive: true },
      });
    }
  }

  const trending = [
    "kurti",
    "earphone",
    "watch",
    "perfume",
    "cricket bat",
    "face wash",
  ];
  for (const [i, term] of trending.entries()) {
    await prisma.trendingSearch.upsert({
      where: { term },
      update: { position: i, isActive: true },
      create: { term, position: i, isActive: true },
    });
  }

  // `{{token}}` placeholders are interpolated from settings at read time (see
  // `services/content.ts`), so the delivery ETA and return window here cannot
  // drift away from what checkout actually applies. Icon names must exist in
  // `lib/icon-map.ts` or they fall back.
  const trust = [
    {
      icon: "Wallet",
      title: "Cash on Delivery",
      subtitle: "Pay when it arrives",
    },
    {
      icon: "Truck",
      title: "Fast Delivery",
      subtitle: "{{insideDhakaEta}} in Dhaka, all 64 districts",
    },
    {
      icon: "RotateCcw",
      title: "{{returnWindowDays}}-Day Returns",
      subtitle: "No questions asked",
    },
    {
      icon: "ShieldCheck",
      title: "100% Authentic",
      subtitle: "Free delivery over {{freeDeliveryOver}}",
    },
  ];
  await prisma.trustItem.deleteMany({});
  await prisma.trustItem.createMany({
    data: trust.map((t, i) => ({ ...t, position: i })),
  });

  const navLinks = [
    { group: "FOOTER_HELP", label: "Track your order", href: "/track-order" },
    { group: "FOOTER_HELP", label: "Shipping & delivery", href: "/shipping" },
    {
      group: "FOOTER_HELP",
      label: "{{returnWindowDays}}-day returns",
      href: "/refund-policy",
    },
    { group: "FOOTER_HELP", label: "FAQ", href: "/faq" },
    { group: "FOOTER_HELP", label: "Contact us", href: "/contact" },
    { group: "FOOTER_COMPANY", label: "About FlexOver BD", href: "/about" },
    { group: "FOOTER_COMPANY", label: "Today's offers", href: "/offers" },
    { group: "FOOTER_COMPANY", label: "Privacy policy", href: "/privacy" },
    { group: "FOOTER_COMPANY", label: "Terms & conditions", href: "/terms" },
    {
      group: "MOBILE_SHORTCUT",
      label: "Today's Offers",
      href: "/offers",
      icon: "Percent",
    },
    {
      group: "MOBILE_SHORTCUT",
      label: "New Arrivals",
      href: "/new-arrivals",
      icon: "Sparkles",
    },
    {
      group: "MOBILE_SHORTCUT",
      label: "Best Sellers",
      href: "/best-sellers",
      icon: "Trophy",
    },
    {
      group: "MOBILE_SHORTCUT",
      label: "Top Rated",
      href: "/top-rated",
      icon: "Star",
    },
    { group: "MOBILE_HELP", label: "About Us", href: "/about" },
    { group: "MOBILE_HELP", label: "Contact", href: "/contact" },
    { group: "MOBILE_HELP", label: "FAQ", href: "/faq" },
    { group: "MOBILE_HELP", label: "Delivery Info", href: "/shipping" },
    {
      group: "MOBILE_HELP",
      label: "Returns & Refunds",
      href: "/refund-policy",
    },
  ] as const;

  const faqs = [
    {
      question: "Do I need an account to order?",
      answer:
        "No. Checkout is guest by default — just your name, mobile number and address. You can tick 'save my details' at the end if you want them remembered for next time.",
    },
    {
      question: "How does cash on delivery work?",
      answer:
        "You pay the rider in cash when the parcel reaches you. Nothing is charged when you place the order. You can open the parcel and check the product before you hand over any money.",
    },
    {
      question: "How much is delivery?",
      answer:
        "{{insideDhakaFee}} inside Dhaka and {{outsideDhakaFee}} outside Dhaka. It is free on every order over {{freeDeliveryOver}}.",
      group: "Delivery",
    },
    {
      question: "How long will it take?",
      answer:
        "{{insideDhakaEta}} inside Dhaka, {{outsideDhakaEta}} elsewhere. Remote upazilas can take an extra day.",
      group: "Delivery",
    },
    {
      question: "Do you deliver to my district?",
      answer: "Yes — we deliver to all 64 districts of Bangladesh.",
      group: "Delivery",
    },
    {
      question: "How do I track my order?",
      answer:
        "Use the tracking page with your order number (it starts with FB-) or the mobile number you ordered with. You do not need an account.",
      ctaLabel: "Track your order",
      ctaHref: "/track-order",
    },
    {
      question: "Can I return something?",
      answer:
        "Yes, within {{returnWindowDays}} days of delivery, as long as it is unused and in its original packaging. If we sent the wrong or a damaged item, we cover the return cost.",
      group: "Returns",
      ctaLabel: "Read the return policy",
      ctaHref: "/refund-policy",
    },
    {
      question: "Are your products authentic?",
      answer:
        "Yes. We source directly and check every parcel before it is sealed. If anything arrives that is not as described, refuse the delivery or tell us within 48 hours.",
    },
    {
      question: "Can I change or cancel my order?",
      answer:
        "Yes, as long as it has not been dispatched. Message us on WhatsApp with your order number as soon as possible.",
    },
    {
      question: "Can I order over WhatsApp instead?",
      answer:
        "Yes. Message {{phone}} with the product you want and we will place the order for you.",
    },
  ];
  await prisma.faqItem.deleteMany({});
  await prisma.faqItem.createMany({
    data: faqs.map((f, i) => ({ ...f, position: i })),
  });

  await prisma.navLink.deleteMany({});
  await prisma.navLink.createMany({
    data: navLinks.map((l, i) => ({
      group: l.group,
      label: l.label,
      href: l.href,
      icon: "icon" in l ? l.icon : null,
      position: i,
    })),
  });
  console.log(
    `  announcements ${announcements.length} · trending ${trending.length} · trust ${trust.length} · faq ${faqs.length} · nav ${navLinks.length}`,
  );
}

async function seedReviews() {
  for (const r of reviews) {
    const product = await prisma.product.findFirst({
      where: { title: r.productBought },
    });
    const existing = await prisma.review.findFirst({
      where: { authorName: r.name, body: r.body },
    });
    if (existing) continue;

    await prisma.review.create({
      data: {
        productId: product?.id ?? null,
        authorName: r.name,
        location: r.location,
        rating: r.rating,
        body: r.body,
        isApproved: true,
        isVerified: r.verified,
      },
    });
  }
  console.log(`  reviews ${reviews.length}`);
}

async function main() {
  console.log("Seeding FlexOver BD…\n");

  console.log("· delivery");
  await seedDelivery();

  console.log("· settings");
  await seedSettings();

  console.log("· catalogue");
  await seedCatalogue();

  console.log("· merchandising");
  await seedMerchandising();

  console.log("· reviews");
  await seedReviews();

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("\nSeed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
