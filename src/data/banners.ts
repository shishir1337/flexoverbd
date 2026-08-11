import type { Banner, PromoTile } from "./types";

/**
 * Hero artwork is photographic only — all headlines are real HTML on top of
 * the image. That keeps copy crisp on every DPR, translatable, indexable by
 * search engines, and editable without regenerating an image.
 *
 * Because of that, each prompt explicitly asks for negative space where the
 * text block sits (bottom on mobile, left on desktop).
 */

const NO_TEXT = "absolutely no text, no typography, no logos, no watermark";

export const heroBanners: Banner[] = [
  {
    id: "hero-fashion",
    eyebrow: "New Season Drop",
    title: "Fashion that keeps up with you",
    subtitle: "Kurti, panjabi, denim & everyday essentials — up to 50% off.",
    cta: "Shop Fashion",
    href: "/category/fashion",
    tone: "light",
    imageMobile: {
      src: "/images/banners/hero-fashion-mobile.png",
      alt: "Young Bangladeshi couple in modern casual fashion",
      width: 1080,
      height: 1080,
      prompt: `Lifestyle fashion photograph of a young South Asian couple in their twenties wearing modern smart-casual clothing — she in a pastel cotton kurti, he in a plain olive shirt — walking and laughing on a sunlit city street. Warm golden-hour light, shallow depth of field, subjects positioned in the upper two thirds with clean uncluttered space across the bottom third for a text overlay. Square 1:1 crop, editorial retail campaign look, ${NO_TEXT}.`,
    },
    imageDesktop: {
      src: "/images/banners/hero-fashion-desktop.png",
      alt: "Young Bangladeshi couple in modern casual fashion",
      width: 2400,
      height: 1030,
      prompt: `Wide lifestyle fashion photograph of a young South Asian couple in their twenties in modern smart-casual clothing — she in a pastel cotton kurti, he in a plain olive shirt — walking on a sunlit city street. Warm golden-hour light, shallow depth of field. Subjects composed on the RIGHT third of the frame; the entire left half is soft clean background with room for a headline. Ultra-wide 21:9 crop, editorial retail campaign look, ${NO_TEXT}.`,
    },
  },
  {
    id: "hero-gadgets",
    eyebrow: "Gadget Fest",
    title: "Tech that's worth the upgrade",
    subtitle: "Earbuds, smart watches & fast charging from ৳990 only.",
    cta: "Shop Gadgets",
    href: "/category/gadgets",
    tone: "dark",
    imageMobile: {
      src: "/images/banners/hero-gadgets-mobile.png",
      alt: "Wireless earbuds, smartwatch and power bank arranged on a dark surface",
      width: 1080,
      height: 1080,
      prompt: `Dramatic tech hero photograph — wireless earbuds in an open case, a smartwatch with a glowing display and a slim power bank floating in a loose diagonal arrangement above a dark charcoal surface. Cool blue rim lighting with a single warm orange accent light, subtle reflections. Products occupy the upper two thirds, clean dark negative space across the bottom third for a text overlay. Square 1:1 crop, ${NO_TEXT}.`,
    },
    imageDesktop: {
      src: "/images/banners/hero-gadgets-desktop.png",
      alt: "Wireless earbuds, smartwatch and power bank arranged on a dark surface",
      width: 2400,
      height: 1030,
      prompt: `Ultra-wide dramatic tech hero photograph — wireless earbuds in an open case, a smartwatch with a glowing display and a slim power bank arranged in a loose diagonal on the RIGHT half of the frame above a dark charcoal surface. Cool blue rim lighting with a warm orange accent. The entire left half is clean dark negative space for a headline. 21:9 crop, ${NO_TEXT}.`,
    },
  },
  {
    id: "hero-home",
    eyebrow: "Home Refresh",
    title: "Small upgrades, big difference",
    subtitle: "Cookware, bedding & storage — save up to 40% this week.",
    cta: "Shop Home Essentials",
    href: "/category/home-essentials",
    tone: "light",
    imageMobile: {
      src: "/images/banners/hero-home-mobile.jpg",
      alt: "Bright modern kitchen counter with cookware and storage jars",
      width: 1080,
      height: 1080,
      prompt: `Bright interior lifestyle photograph of a modern kitchen counter — a matte black non-stick pan, glass storage jars with bamboo lids, stacked ceramic bowls and a folded linen towel — with soft morning sunlight falling across a warm wood surface and a plant blurred in the background. Composition sits in the upper two thirds with clean uncluttered counter space across the bottom third for a text overlay. Square 1:1 crop, ${NO_TEXT}.`,
    },
    imageDesktop: {
      src: "/images/banners/hero-home-desktop.png",
      alt: "Bright modern kitchen counter with cookware and storage jars",
      width: 2400,
      height: 1030,
      prompt: `Ultra-wide bright interior photograph of a modern kitchen counter — matte black non-stick pan, glass storage jars with bamboo lids, stacked ceramic bowls and a folded linen towel — arranged on the RIGHT half over a warm wood surface in soft morning sunlight. The left half is a softly blurred bright wall with room for a headline. 21:9 crop, ${NO_TEXT}.`,
    },
  },
];

export const promoTiles: PromoTile[] = [
  {
    id: "promo-beauty",
    title: "Beauty Week",
    subtitle: "Buy 2, get 1 free on skincare & haircare",
    cta: "Grab the deal",
    href: "/category/beauty",
    tone: "light",
    image: {
      src: "/images/banners/promo-beauty.png",
      alt: "Skincare bottles arranged on a soft pink surface",
      width: 1200,
      height: 800,
      prompt: `Soft beauty campaign photograph — an amber serum dropper bottle, a white cream jar and a frosted toner bottle grouped on the RIGHT side of a blush-pink surface with a single fresh petal and gentle window shadows. Left third left clean and empty for a text overlay. 3:2 crop, luminous diffused lighting, ${NO_TEXT}.`,
    },
  },
  {
    id: "promo-delivery",
    title: "Free delivery over {{freeDeliveryOver}}",
    subtitle: "Cash on delivery available nationwide",
    cta: "Start shopping",
    href: "/category/lifestyle",
    tone: "light",
    image: {
      src: "/images/banners/promo-delivery.png",
      alt: "Delivery rider with a parcel box on a Dhaka street",
      width: 1200,
      height: 800,
      prompt: `Warm documentary-style photograph of a friendly South Asian delivery rider in a plain orange jacket and helmet handing over a plain brown cardboard parcel, photographed on a bright Dhaka residential street with a softly blurred background. Subject on the RIGHT side, clean blurred space on the left third for a text overlay. 3:2 crop, natural daylight, ${NO_TEXT}.`,
    },
  },
];

/** Full-bleed strip banner used between the product sections. */
export const wideBanner: PromoTile = {
  id: "promo-gadget-strip",
  title: "Upgrade your everyday tech",
  subtitle: "Earbuds, smart watches and chargers with 1 year warranty",
  cta: "Explore gadgets",
  href: "/category/gadgets",
  tone: "dark",
  image: {
    src: "/images/banners/promo-gadget-strip.png",
    alt: "Smartwatch and earbuds on a dark textured surface",
    width: 2000,
    height: 700,
    prompt: `Ultra-wide moody product photograph — a smartwatch with a glowing display and wireless earbuds in an open case arranged on the RIGHT third of a dark textured slate surface, lit with cool blue rim light and one warm orange accent. The left two thirds are deep clean shadow for a headline overlay. Cinematic 20:7 crop, ${NO_TEXT}.`,
  },
};
