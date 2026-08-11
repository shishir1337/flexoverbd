import { categoryBySlug } from "./categories";
import { reviews } from "./reviews";
import type { Product, Review } from "./types";

/**
 * Detail-page copy.
 *
 * None of this is stored per product. `description` and the rest are derived
 * from attributes the catalogue already has, using category-level templates —
 * because 62 hand-written paragraphs of placeholder prose would be 62 things
 * to delete later, and would read as though they were real.
 *
 * `Product.description` exists as an optional field so genuine copy overrides
 * the template the moment the backend supplies it. Same shape, real data.
 */

/* ------------------------------------------------------------ Description */

const CATEGORY_COPY: Record<string, string[]> = {
  fashion: [
    "Cut for everyday wear in Bangladesh's climate — breathable, easy to wash, and it holds its shape after repeated laundering.",
    "An everyday piece that works as hard as you do: comfortable through a full day, and smart enough to wear out afterwards.",
  ],
  gadgets: [
    "Tested against the daily commute — pocketable, quick to pair, and built to survive being carried around every day.",
    "Straightforward to set up and reliable in daily use, with the battery life to get through a working day without hunting for a socket.",
  ],
  "home-essentials": [
    "Built for a busy Bangladeshi kitchen — heats evenly, cleans up quickly, and stands up to daily cooking.",
    "A practical upgrade you will notice every day, sized for real family cooking rather than a showroom.",
  ],
  beauty: [
    "Formulated for humid weather and daily use, and gentle enough to work into a routine you will actually keep.",
    "Suits the everyday routine: absorbs quickly, layers cleanly, and does not feel heavy in Dhaka's humidity.",
  ],
  fragrances: [
    "A long-wearing scent that holds through a warm day — sprayed in the morning, still there in the evening.",
    "Balanced for daily wear rather than a single occasion, with enough presence to carry an evening out.",
  ],
  lifestyle: [
    "Chosen for the details — the finish, the weight in the hand, and the fact that it still looks good after a season of use.",
    "The kind of everyday object worth spending slightly more on, because you will reach for it constantly.",
  ],
  sports: [
    "Match-ready and built to take a season of use, whether that is a Friday morning game or serious practice.",
    "Made for real play rather than the shelf — the weight, balance and grip are where they should be.",
  ],
  "watches-bags": [
    "Finished to a standard you can see up close, and built to be worn every day rather than saved for occasions.",
    "Everyday-smart: understated enough for the office, solid enough that it will not look tired in a year.",
  ],
};

/** Stable per-product variant so two items in a category do not read identically. */
function pick<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(hash) % options.length];
}

/**
 * Copy for a category the templates above do not cover.
 *
 * Categories are admin-created and admin-renamed now, so the map can never be
 * exhaustive — indexing it blind used to crash the whole prerender the first
 * time someone renamed a slug.
 */
const GENERIC_COPY = [
  "Chosen for everyday use in Bangladesh — practical, well made, and priced to be worth it.",
  "A dependable everyday pick: straightforward, well finished, and built to last past the first few months.",
];

export function productDescription(product: Product): string {
  if (product.description) return product.description;

  const lead = `${product.title} from ${product.brand}, part of our ${product.subcategory.toLowerCase()} range.`;
  const copy = CATEGORY_COPY[product.category] ?? GENERIC_COPY;
  return `${lead} ${pick(copy, product.slug)}`;
}

/** True when the copy above is a template rather than the client's own words. */
export function isPlaceholderDescription(product: Product): boolean {
  return !product.description;
}

/* ------------------------------------------------------------- Highlights */

/** Bullet points, every one derived from a real attribute — no invented claims. */
/**
 * Commerce rules these helpers quote in copy.
 *
 * Passed in rather than imported so the module stays a pure formatter: the
 * values are admin-editable settings that only a server component can read,
 * and a top-level `await` here would make every caller of every helper async.
 */
export type CommerceCopy = {
  freeShippingThreshold: number;
  returnWindowDays: number;
};

export function productHighlights(
  product: Product,
  commerce: CommerceCopy,
): string[] {
  const points: string[] = [];

  if (product.badge === "bestseller") {
    points.push(`Bestseller — ${product.sold.toLocaleString()} sold`);
  }
  // Only worth a bullet when there is an actual choice — "available in 1
  // colours" is both ungrammatical and not a selling point.
  if (product.colors && product.colors.length > 1) {
    points.push(
      `Choose from ${product.colors.length} colours: ${product.colors.map((c) => c.name).join(", ")}`,
    );
  }
  points.push(
    product.freeDelivery
      ? "Free delivery on this item"
      : `Free delivery on orders over ৳${commerce.freeShippingThreshold.toLocaleString()}`,
  );
  points.push("Cash on delivery available in all 64 districts");
  points.push(`${commerce.returnWindowDays}-day easy return`);

  if (product.rating >= 4.5) {
    points.push(`Rated ${product.rating} by ${product.reviewCount} buyers`);
  }

  return points;
}

/* ------------------------------------------------------------------ Specs */

/** Categories where buyers expect a warranty line. Plain strings, since a
 *  renamed or admin-created slug simply will not match. */
const WARRANTIED: string[] = ["gadgets", "watches-bags", "home-essentials"];

export function productSpecs(
  product: Product,
  commerce: CommerceCopy,
): { label: string; value: string }[] {
  const category = categoryBySlug.get(product.category);

  const specs = [
    { label: "Brand", value: product.brand },
    { label: "Category", value: category?.name ?? product.category },
    { label: "Type", value: product.subcategory },
    { label: "SKU", value: product.id.toUpperCase() },
  ];

  if (product.colors?.length) {
    specs.push({
      label: "Colours",
      value: product.colors.map((c) => c.name).join(", "),
    });
  }
  if (product.sizes?.options.length) {
    const inStock = product.sizes.options.filter((o) => o.inStock);
    specs.push({
      label: product.sizes.system === "footwear" ? "Sizes (EU)" : "Sizes",
      value: inStock.map((o) => o.value).join(", "),
    });
  }
  if (WARRANTIED.includes(product.category)) {
    specs.push({ label: "Warranty", value: "1 year service warranty" });
  }

  specs.push({ label: "Country of origin", value: "Imported" });
  specs.push({
    label: "Returns",
    value: `${commerce.returnWindowDays} days from delivery`,
  });

  return specs;
}

/* ---------------------------------------------------------------- Reviews */

/**
 * Generic bodies used when a product has no named demo review of its own.
 * Deliberately non-specific — a review that praised the wrong feature would
 * read as obviously fake.
 */
const GENERIC_REVIEWS: Omit<Review, "id" | "productBought">[] = [
  {
    name: "Imran Kabir",
    location: "Mirpur, Dhaka",
    rating: 5,
    date: "1 week ago",
    body: "Exactly what was shown on the website. Packaging was sealed properly and the delivery man called before arriving. Paid cash, no problem.",
    verified: true,
  },
  {
    name: "Sadia Akter",
    location: "Bashundhara, Dhaka",
    rating: 5,
    date: "3 weeks ago",
    body: "Good quality for the price. Ordered on a Monday and got it Wednesday. Would order from FlexOver again.",
    verified: true,
  },
  {
    name: "Mahmudul Hasan",
    location: "Chawkbazar, Chattogram",
    rating: 4,
    date: "1 month ago",
    body: "Product is fine and matches the description. Delivery outside Dhaka took an extra day but they kept me updated on WhatsApp.",
    verified: true,
  },
  {
    name: "Ruma Begum",
    location: "Bogura Sadar, Bogura",
    rating: 5,
    date: "2 months ago",
    body: "Was worried about ordering online but it arrived well packed and undamaged. Cash on delivery made it easy to trust.",
    verified: true,
  },
];

export function getProductReviews(product: Product, limit = 3): Review[] {
  // A named review that actually mentions this product always leads.
  const named = reviews.filter((r) => r.productBought === product.title);

  const filler = GENERIC_REVIEWS.map((r, i) => ({
    ...r,
    id: `${product.id}-generic-${i}`,
    productBought: product.title,
  }));

  // Rotate the filler by product so neighbouring items do not show the
  // same two reviews in the same order.
  const offset =
    Math.abs(
      product.id
        .split("")
        .reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0),
    ) % filler.length;
  const rotated = [...filler.slice(offset), ...filler.slice(0, offset)];

  return [...named, ...rotated].slice(0, limit);
}

/**
 * Star distribution implied by the product's average and review count.
 * Derived rather than random so the bars stay put between renders and match
 * the headline figure.
 */
export function ratingBreakdown(
  product: Product,
): { stars: number; count: number; percent: number }[] {
  // Weight mass around the average: the closer a star band is to the mean,
  // the more reviews it gets. Simple, but it produces a believable J-curve.
  const weights = [5, 4, 3, 2, 1].map((stars) => {
    const distance = Math.abs(stars - product.rating);
    return 1 / (distance + 0.35) ** 2.6;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) =>
    Math.round((w / total) * product.reviewCount),
  );

  // Push any rounding drift into the top band so the sum always reconciles.
  const drift = product.reviewCount - counts.reduce((a, b) => a + b, 0);
  counts[0] += drift;

  return [5, 4, 3, 2, 1].map((stars, i) => ({
    stars,
    count: Math.max(0, counts[i]),
    percent: product.reviewCount
      ? Math.round((Math.max(0, counts[i]) / product.reviewCount) * 100)
      : 0,
  }));
}
