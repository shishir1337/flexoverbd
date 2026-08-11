import type { Category } from "./types";

/**
 * Eight departments. The mix is deliberately shaped around what a
 * multi-category Bangladeshi store actually moves — perfume and cricket gear
 * earn their own space, which they would not in a Western template.
 */

export const categories: Category[] = [
  {
    slug: "fashion",
    name: "Fashion",
    shortName: "Fashion",
    blurb: "Shirts, dresses, tees & footwear",
    itemCount: 1240,
    tint: "from-rose-100 to-orange-50",
    subcategories: [
      { slug: "mens-shirts", name: "Men's Shirts" },
      { slug: "t-shirts", name: "T-Shirts" },
      { slug: "dresses", name: "Dresses" },
      { slug: "footwear", name: "Footwear" },
    ],
    image: {
      src: "/images/categories/fashion.jpg",
      alt: "Men's check cotton shirt",
      width: 800,
      height: 800,
      demoSource: "dummyjson:83",
      prompt:
        "Flat lay of neatly folded everyday clothing — a check cotton shirt, a plain white tee and a folded pair of jeans — on a warm beige surface, soft daylight, square crop, no text or logos.",
    },
  },
  {
    slug: "gadgets",
    name: "Gadgets",
    shortName: "Gadgets",
    blurb: "Earbuds, chargers, speakers",
    itemCount: 860,
    tint: "from-sky-100 to-indigo-50",
    subcategories: [
      { slug: "audio", name: "Audio" },
      { slug: "power", name: "Power" },
      { slug: "smart-home", name: "Smart Home" },
      { slug: "accessories", name: "Accessories" },
    ],
    image: {
      src: "/images/categories/gadgets.jpg",
      alt: "True wireless earbuds in an open charging case",
      width: 800,
      height: 800,
      demoSource: "dummyjson:100",
      prompt:
        "Flat lay of modern consumer tech — wireless earbuds in an open charging case, a compact charger and a braided cable — on a light grey surface, cool clean lighting, square crop, no text or logos.",
    },
  },
  {
    slug: "home-essentials",
    name: "Home Essentials",
    shortName: "Home",
    blurb: "Cookware, appliances, storage",
    itemCount: 970,
    tint: "from-amber-100 to-yellow-50",
    subcategories: [
      { slug: "cookware", name: "Cookware" },
      { slug: "appliances", name: "Appliances" },
      { slug: "kitchen-tools", name: "Kitchen Tools" },
      { slug: "storage", name: "Storage" },
    ],
    image: {
      src: "/images/categories/home-essentials.jpg",
      alt: "Carbon steel wok",
      width: 800,
      height: 800,
      demoSource: "dummyjson:52",
      prompt:
        "Warm kitchen counter scene with a carbon steel wok, a stainless pot and a wooden chopping board, soft morning window light, square crop, no text or logos.",
    },
  },
  {
    slug: "beauty",
    name: "Beauty & Care",
    shortName: "Beauty",
    blurb: "Makeup, skincare, body care",
    itemCount: 1120,
    tint: "from-pink-100 to-rose-50",
    subcategories: [
      { slug: "makeup", name: "Makeup" },
      { slug: "skincare", name: "Skincare" },
      { slug: "body-care", name: "Body Care" },
      { slug: "nails", name: "Nails" },
    ],
    image: {
      src: "/images/categories/beauty.jpg",
      alt: "Eyeshadow palette with mirror",
      width: 800,
      height: 800,
      demoSource: "dummyjson:2",
      prompt:
        "Minimal beauty flat lay — an eyeshadow palette, a lipstick and a cream jar on a blush-pink surface with a single fresh petal, soft diffused light, square crop, no text or logos.",
    },
  },
  {
    slug: "fragrances",
    name: "Fragrances",
    shortName: "Perfume",
    blurb: "Perfume, attar & body mist",
    itemCount: 480,
    tint: "from-stone-200 to-amber-50",
    subcategories: [
      { slug: "womens-perfume", name: "Women's Perfume" },
      { slug: "unisex", name: "Unisex" },
    ],
    image: {
      src: "/images/categories/fragrances.jpg",
      alt: "Dark glass eau de parfum bottle",
      width: 800,
      height: 800,
      demoSource: "dummyjson:7",
      prompt:
        "Premium fragrance still life — a dark glass perfume bottle with a gold cap on a polished stone surface, moody warm side lighting with a soft reflection, square crop, no text or logos.",
    },
  },
  {
    slug: "lifestyle",
    name: "Lifestyle",
    shortName: "Lifestyle",
    blurb: "Sunglasses, jewellery, decor",
    itemCount: 540,
    tint: "from-emerald-100 to-teal-50",
    subcategories: [
      { slug: "sunglasses", name: "Sunglasses" },
      { slug: "jewellery", name: "Jewellery" },
      { slug: "home-decor", name: "Home Decor" },
      { slug: "lighting", name: "Lighting" },
    ],
    image: {
      src: "/images/categories/lifestyle.jpg",
      alt: "Black framed sunglasses",
      width: 800,
      height: 800,
      demoSource: "dummyjson:154",
      prompt:
        "Lifestyle flat lay — a pair of black sunglasses, small gold earrings and a folded linen scarf on a warm oak surface, natural daylight, square crop, no text or logos.",
    },
  },
  {
    slug: "sports",
    name: "Sports & Fitness",
    shortName: "Sports",
    blurb: "Cricket, football, racket sports",
    itemCount: 430,
    tint: "from-lime-100 to-green-50",
    subcategories: [
      { slug: "cricket", name: "Cricket" },
      { slug: "football", name: "Football" },
      { slug: "badminton", name: "Badminton" },
      { slug: "tennis", name: "Tennis" },
    ],
    image: {
      src: "/images/categories/sports.jpg",
      alt: "Cricket bat",
      width: 800,
      height: 800,
      demoSource: "dummyjson:143",
      prompt:
        "Sports gear flat lay — a cricket bat, a red leather cricket ball and a pair of batting gloves on a light grey floor, crisp directional light, square crop, no text or logos.",
    },
  },
  {
    slug: "watches-bags",
    name: "Watches & Bags",
    shortName: "Watches",
    blurb: "Watches, handbags, backpacks",
    itemCount: 380,
    tint: "from-stone-200 to-orange-50",
    subcategories: [
      { slug: "mens-watch", name: "Men's Watch" },
      { slug: "womens-watch", name: "Women's Watch" },
      { slug: "handbag", name: "Handbag" },
      { slug: "backpack", name: "Backpack" },
    ],
    image: {
      src: "/images/categories/watches-bags.jpg",
      alt: "Brown leather strap wristwatch",
      width: 800,
      height: 800,
      demoSource: "dummyjson:93",
      prompt:
        "Premium accessories flat lay — a leather-strap wristwatch and a tan leather bag corner on a dark walnut surface, moody warm light, square crop, no text or logos.",
    },
  },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
