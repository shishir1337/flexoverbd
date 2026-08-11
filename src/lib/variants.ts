import type { Product, Variant } from "@/data/types";

/**
 * Variant handling.
 *
 * A product may offer colour, size, both or neither. Three rules fall out of
 * that, and all three matter for correctness:
 *
 *  1. An option with a single value is **not a choice** — it is metadata. A
 *     wok that comes in Black should not send anyone to a picker to confirm
 *     it is black. Such values are applied silently instead.
 *  2. Whatever genuinely offers a choice must be chosen before the item can be
 *     bought. A shirt added with no size is an order the warehouse cannot pick.
 *  3. Each combination is its own cart line. Keying lines on the product id
 *     alone would silently merge a Medium and a Large into one line of two.
 *
 * Rules 1 and 3 interact: because a lone value is applied silently rather than
 * dropped, the grid and the detail page must agree on it, or the same product
 * added from each place would land as two lines. `defaultVariant` is the single
 * source of that agreement — both call sites derive their line id from it.
 */

type Options = Pick<Product, "colors" | "sizes">;

/** Values a shopper can actually pick between. One value is not a choice. */
export function choosableColours(p: Options) {
  return (p.colors?.length ?? 0) > 1 ? (p.colors ?? []) : [];
}

export function choosableSizes(p: Options) {
  const options = p.sizes?.options ?? [];
  return options.length > 1 ? options : [];
}

/** Which options this product requires the shopper to pick. */
export function requiredOptions(p: Options): ("colour" | "size")[] {
  const required: ("colour" | "size")[] = [];
  if (choosableColours(p).length) required.push("colour");
  if (choosableSizes(p).length) required.push("size");
  return required;
}

/** True when the shopper must visit the detail page before they can buy. */
export function hasOptions(p: Options): boolean {
  return requiredOptions(p).length > 0;
}

export function isVariantComplete(p: Options, variant: Variant): boolean {
  return requiredOptions(p).every((option) =>
    option === "colour" ? Boolean(variant.colour) : Boolean(variant.size),
  );
}

/**
 * Cart line identity — `p-001::colour:Navy::size:M`.
 *
 * Ordered and delimited so it stays stable across renders and readable in
 * devtools. Colour always precedes size so the same pair cannot produce two
 * spellings of the same id.
 */
export function variantLineId(productId: string, variant: Variant): string {
  const parts: string[] = [];
  if (variant.colour) parts.push(`colour:${variant.colour}`);
  if (variant.size) parts.push(`size:${variant.size}`);
  return parts.length ? `${productId}::${parts.join("::")}` : productId;
}

/** Human-readable summary for cart rows and order lines: "Navy · Size M". */
export function variantLabel(variant: Variant | undefined): string | null {
  if (!variant) return null;
  const parts: string[] = [];
  if (variant.colour) parts.push(variant.colour);
  if (variant.size) {
    // Footwear sizes are bare numbers, which read as nonsense without a prefix.
    const prefix = variant.sizeSystem === "footwear" ? "EU " : "Size ";
    parts.push(`${prefix}${variant.size}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/**
 * The starting variant.
 *
 * Single-value options are applied outright — they are the only possibility,
 * so leaving them off would lose information the packing slip needs. Colour
 * also pre-selects when there is a choice, because the swatch is visible in
 * the photography anyway and every product page ships showing one.
 *
 * Size deliberately does NOT pre-select when there is a choice. Guessing
 * someone's size and letting them buy it unnoticed is worse than one more tap.
 */
export function defaultVariant(p: Options): Variant {
  const variant: Variant = {};

  const colour = p.colors?.find((c) => c.inStock !== false);
  if (colour) variant.colour = colour.name;

  const sizes = p.sizes?.options ?? [];
  if (sizes.length === 1 && sizes[0].inStock) {
    variant.size = sizes[0].value;
    variant.sizeSystem = p.sizes?.system;
  }

  return variant;
}
