"use client";

import { ShoppingBag, Zap } from "lucide-react";
import { type CartLine, useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { discountPercent, formatBDT } from "@/lib/utils";

/**
 * Mobile-only purchase bar, pinned to the bottom for the whole page.
 *
 * It takes the bottom nav's place rather than stacking on top of it — the
 * nav hides itself on product routes — because two fixed bars would cost
 * ~120px of a phone viewport on the page where the buy decision happens.
 */
export function StickyBuyBar({
  line,
  compareAt,
  needsOptions,
}: {
  line: Omit<CartLine, "qty">;
  compareAt?: number;
  /** When the product has a colour or size to pick, this bar must not add
   *  blind — it scrolls to the picker instead. */
  needsOptions: boolean;
}) {
  const { add, openCart } = useCart();
  const off = discountPercent(line.price, compareAt);

  function act(open: boolean) {
    if (needsOptions) {
      document
        .getElementById("buy-options")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    add(line, 1);
    if (open) openCart();
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 pb-safe backdrop-blur-md lg:hidden"
      style={{ zIndex: "var(--z-bottomnav)" }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="min-w-0 shrink">
          <p
            data-price
            className="text-lg leading-tight font-extrabold text-ink"
          >
            {formatBDT(line.price)}
          </p>
          {off > 0 && (
            <p className="flex items-center gap-1.5 text-2xs leading-tight">
              <span data-price className="text-ink-3 line-through">
                {formatBDT(compareAt as number)}
              </span>
              <span className="font-bold text-danger">-{off}%</span>
            </p>
          )}
        </div>

        <Button
          onClick={() => act(false)}
          variant="secondary"
          className="h-12 flex-1 px-2 text-sm"
          aria-label={
            needsOptions
              ? `Choose options for ${line.title}`
              : `Add ${line.title} to cart`
          }
        >
          <ShoppingBag aria-hidden className="size-4" />
          {needsOptions ? "Options" : "Add"}
        </Button>
        <Button
          onClick={() => act(true)}
          className="h-12 flex-1 px-2 text-sm"
          aria-label={`Buy ${line.title} now`}
        >
          <Zap aria-hidden className="size-4" />
          Buy Now
        </Button>
      </div>
    </div>
  );
}
