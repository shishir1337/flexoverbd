"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-context";
import { cn } from "@/lib/utils";

/**
 * Backed by the shared wishlist store, so the heart state is consistent
 * wherever the same product appears — grid, rail, detail page — and survives a
 * reload. Kept as its own tiny client island so product cards stay
 * server-rendered.
 */
export function WishlistButton({
  productId,
  title,
  className,
}: {
  productId: string;
  title: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);

  return (
    <button
      type="button"
      data-product={productId}
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={
        saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`
      }
      className={cn(
        // size-9 (36px) clears WCAG 2.5.8's 24px floor with margin while still
        // leaving the packshot readable on a ~165px-wide card; a full 44px
        // button would cover a quarter of the product image.
        "relative grid size-9 place-items-center rounded-full bg-surface/85 backdrop-blur-sm tap",
        "shadow-sm transition-[color,transform] duration-200 ease-(--ease-out-soft) active:scale-90",
        // Extends the tap target to 44px without changing the visual size.
        "after:absolute after:-inset-2 after:content-['']",
        saved ? "text-danger" : "text-ink-2 hover:text-danger",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-4", saved && "fill-current")}
        strokeWidth={2}
      />
    </button>
  );
}
