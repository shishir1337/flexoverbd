"use client";

import {
  AlertCircle,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { useId, useState } from "react";
import { type CartLine, useCart } from "@/components/cart/cart-context";
import { useContactInfo, useSettings } from "@/components/settings-provider";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import type { ColorOption, SizeGroup, Variant } from "@/data/types";
import { cn, formatBDT } from "@/lib/utils";
import {
  choosableColours,
  choosableSizes,
  defaultVariant,
  variantLabel,
  variantLineId,
} from "@/lib/variants";

export type BuyBoxProduct = {
  /** Everything about the line except the variant-derived id and qty. */
  base: Omit<CartLine, "qty" | "id" | "variant">;
  slug: string;
  stock: number;
  colors?: ColorOption[];
  sizes?: SizeGroup;
};

/**
 * Colour, size, quantity and the three ways to buy.
 *
 * Only genuine choices get a picker: a product sold in one colourway shows no
 * colour row, because a control with a single option is a question with one
 * answer. That value still reaches the cart line via `defaultVariant`, so the
 * packing slip keeps it.
 *
 * Colour pre-selects (the swatch is visible in the photography anyway) but
 * **size deliberately does not** — quietly defaulting someone to Medium and
 * letting them buy it is worse than one extra tap. Attempting to add without
 * choosing surfaces an inline error and focuses the picker rather than failing
 * silently.
 */
export function BuyBox({ product }: { product: BuyBoxProduct }) {
  const contact = useContactInfo();
  const { site } = useSettings();
  const { add, openCart } = useCart();
  const sizeGroupId = useId();

  // Only options with more than one value are offered as a choice; the rest
  // are applied silently by `defaultVariant`.
  const colours = choosableColours(product);
  const sizes = choosableSizes(product);
  const hasSizes = sizes.length > 0;
  const hasColours = colours.length > 0;

  const [variant, setVariant] = useState<Variant>(() =>
    defaultVariant(product),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = Math.min(product.stock, 10);
  const missingSize = hasSizes && !variant.size;

  function commit(then: "cart" | "open") {
    if (missingSize) {
      setError("Please choose a size first.");
      document.getElementById(sizeGroupId)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      return;
    }

    setError(null);
    // A variant with no keys must stay undefined, or every plain product
    // would carry an empty object through to the order.
    const hasAny = Boolean(variant.colour || variant.size);
    add(
      {
        ...product.base,
        id: variantLineId(product.base.productId, variant),
        variant: hasAny ? variant : undefined,
      },
      qty,
    );

    if (then === "open") {
      openCart();
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  }

  const waMessage = [
    "Hi FlexOver BD, I'd like to order:",
    "",
    product.base.title,
    `Price: ${formatBDT(product.base.price)}`,
    variantLabel(variant),
    `Quantity: ${qty}`,
    "",
    `${site.url}/product/${product.slug}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return (
    <div id="buy-options" className="flex scroll-mt-24 flex-col gap-4">
      {hasColours && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Colour:{" "}
            <span className="font-normal text-ink-2">{variant.colour}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => {
              const soldOut = c.inStock === false;
              const selected = variant.colour === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setVariant((v) => ({ ...v, colour: c.name }))}
                  aria-pressed={selected}
                  // The name is written out beside the swatch, so colour is
                  // never the only way to tell the options apart.
                  aria-label={soldOut ? `${c.name} — sold out` : c.name}
                  className={cn(
                    // min-h-11 keeps the swatch a 44px touch target; at
                    // py-1.5 it measured 34px, which is a miss on a phone.
                    "flex min-h-11 items-center gap-2 rounded-chip border py-1.5 pr-3.5 pl-2 text-sm tap transition-colors",
                    selected
                      ? "border-brand-500 bg-brand-soft text-brand-on"
                      : "border-line text-ink-2 hover:border-line-strong",
                    soldOut && "opacity-40",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className={cn(soldOut && "line-through")}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasSizes && (
        <fieldset id={sizeGroupId} className="scroll-mt-28">
          <legend className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
            Size:{" "}
            <span className="font-normal text-ink-2">
              {variant.size
                ? sizes.find((s) => s.value === variant.size)?.label
                : "Please select"}
            </span>
          </legend>

          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const selected = variant.size === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  disabled={!size.inStock}
                  onClick={() => {
                    setVariant((v) => ({
                      ...v,
                      size: size.value,
                      sizeSystem: product.sizes?.system,
                    }));
                    setError(null);
                  }}
                  aria-pressed={selected}
                  aria-label={
                    size.inStock ? size.label : `${size.label} — sold out`
                  }
                  className={cn(
                    "grid h-11 min-w-12 place-items-center rounded-btn border px-3 text-sm font-semibold tap transition-colors",
                    selected
                      ? "border-brand-500 bg-brand-soft text-brand-on"
                      : "border-line text-ink-2 hover:border-line-strong",
                    // Sold-out sizes stay visible and struck through rather
                    // than disappearing — otherwise the row silently changes
                    // shape and people wonder if they misread it.
                    !size.inStock &&
                      "cursor-not-allowed border-line bg-surface-2 text-ink-4 line-through",
                  )}
                >
                  {size.value}
                </button>
              );
            })}
          </div>

          {product.sizes?.guideNote && (
            <p className="mt-2 text-xs text-ink-3">{product.sizes.guideNote}</p>
          )}
        </fieldset>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-btn bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          <AlertCircle aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-ink">Quantity</span>
        <div className="flex items-center rounded-btn border border-line">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="grid size-11 place-items-center rounded-l-btn text-ink-2 tap hover:bg-surface-2 disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <span
            aria-live="polite"
            className="w-10 text-center font-semibold tnum"
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max}
            aria-label="Increase quantity"
            className="grid size-11 place-items-center rounded-r-btn text-ink-2 tap hover:bg-surface-2 disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        {product.stock <= 20 && (
          <span className="text-sm font-semibold text-danger">
            Only {product.stock} left
          </span>
        )}
      </div>

      {/*
        `w-full sm:flex-1`, not a bare `flex-1`. While this row is flex-col the
        main axis is vertical, so `flex-1` sets a *height* basis of 0 and eats
        the button's h-12 — they render ~25px tall on a phone. Width only needs
        stretching once the row turns horizontal at sm.
      */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={() => commit("cart")}
          variant="secondary"
          size="lg"
          className="w-full sm:flex-1"
        >
          {added ? (
            <>
              <Check aria-hidden className="size-4.5" strokeWidth={2.5} />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingBag aria-hidden className="size-4.5" />
              Add to Cart
            </>
          )}
        </Button>
        <Button
          onClick={() => commit("open")}
          size="lg"
          className="w-full sm:flex-1"
        >
          <Zap aria-hidden className="size-4.5" />
          Buy Now
        </Button>
      </div>

      <a
        href={`${contact.whatsappUrl.split("?")[0]}?text=${encodeURIComponent(waMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2.5 rounded-btn border border-[#25D366] bg-[#25D366]/10 text-[0.9375rem] font-bold text-[#128C4A] tap transition-colors hover:bg-[#25D366]/20"
      >
        <WhatsAppIcon className="size-5 text-[#25D366]" />
        Order on WhatsApp
      </a>
    </div>
  );
}
