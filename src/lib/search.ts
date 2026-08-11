import { categoryBySlug } from "@/data/categories";
import type { Product } from "@/data/types";

/**
 * Catalogue search.
 *
 * Deliberately simple and forgiving rather than clever: shoppers here type
 * "earbud", "panjabi", "watch for men" — partial words and category names, not
 * exact titles. So every token has to match *something* (title, brand,
 * category, subcategory or tag) as a substring, and results are ranked by
 * where the match landed.
 *
 * This is a stand-in for a real search index. When the backend arrives it
 * should be replaced by Postgres full-text or Meilisearch — the signature
 * stays the same.
 */

export type SearchHit = { product: Product; score: number };

function haystack(product: Product) {
  const category = categoryBySlug.get(product.category);
  return {
    title: product.title.toLowerCase(),
    brand: product.brand.toLowerCase(),
    subcategory: product.subcategory.toLowerCase(),
    category: (category?.name ?? product.category).toLowerCase(),
    tags: product.tags.join(" ").toLowerCase(),
  };
}

/** Weighted so a title match outranks a tag match for the same term. */
const WEIGHTS = {
  title: 10,
  brand: 6,
  subcategory: 5,
  category: 3,
  tags: 2,
} as const;

/**
 * Words shoppers actually type, mapped onto words the catalogue uses.
 *
 * Substring matching alone fails the obvious cases — someone searching
 * "earbuds" gets nothing back from a catalogue that says "Earphones" and
 * "AirPods". Each entry expands a query token into extra terms; a match on any
 * one of them counts.
 */
const SYNONYMS: Record<string, string[]> = {
  earbud: ["earphone", "airpod", "audio"],
  earbuds: ["earphone", "airpod", "audio"],
  earphone: ["earbud", "airpod", "audio"],
  headphone: ["airpods max", "audio", "earphone"],
  headphones: ["airpods max", "audio", "earphone"],
  airpod: ["earphone", "audio"],
  charger: ["adapter", "power", "charging"],
  powerbank: ["battery", "power"],
  "power-bank": ["battery", "power"],
  speaker: ["echo", "smart home"],
  perfume: ["parfum", "toilette", "fragrance"],
  attar: ["parfum", "fragrance"],
  scent: ["parfum", "fragrance"],
  sunglass: ["sunglasses", "glasses"],
  shades: ["sunglasses"],
  tshirt: ["t-shirt"],
  tee: ["t-shirt"],
  shoe: ["trainers", "shoes", "footwear", "slipper"],
  shoes: ["trainers", "footwear", "slipper"],
  sneaker: ["trainers", "footwear"],
  bag: ["handbag", "backpack"],
  purse: ["handbag"],
  lipstick: ["makeup", "lip"],
  makeup: ["mascara", "lipstick", "eyeshadow", "powder"],
  cream: ["lotion", "moisture"],
  pan: ["wok", "frying", "cookware"],
  kadai: ["wok", "cookware"],
  blender: ["blender", "appliances"],
  oven: ["microwave"],
  ghori: ["watch"],
  cricket: ["cricket", "bat", "ball"],
};

function expand(token: string): string[] {
  return [token, ...(SYNONYMS[token] ?? [])];
}

export function searchProducts(products: Product[], query: string): Product[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean)
    // Stop words: "shirt for men" should not require the word "for".
    .filter((t) => !["for", "and", "the", "with", "in", "a"].includes(t));

  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const product of products) {
    const fields = haystack(product);
    let score = 0;
    let matchedAll = true;

    for (const token of tokens) {
      let best = 0;
      for (const variant of expand(token)) {
        for (const [field, weight] of Object.entries(WEIGHTS)) {
          const value = fields[field as keyof typeof fields];
          if (!value.includes(variant)) continue;
          // A term that starts a word is a stronger signal than one buried
          // mid-string — "watch" should rank the watch above "smartwatch case".
          const boost = new RegExp(`\\b${variant}`, "u").test(value) ? 1.5 : 1;
          // Synonym hits score below a direct hit so exact matches still lead.
          const penalty = variant === token ? 1 : 0.6;
          best = Math.max(best, weight * boost * penalty);
        }
      }
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }

    if (matchedAll) {
      // Popularity breaks ties between equally relevant products.
      hits.push({ product, score: score + Math.min(product.sold / 5000, 2) });
    }
  }

  return hits.sort((a, b) => b.score - a.score).map((h) => h.product);
}

/** Related terms offered when a search returns nothing. */
export function suggestTerms(products: Product[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
