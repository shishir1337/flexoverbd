"use client";

import { Zap } from "lucide-react";
import { type CartLine, useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Buy Now, for grid cards.
 *
 * Adds the line and opens the cart drawer — the same thing the detail page's
 * Buy Now does, deliberately. Jumping straight to /checkout would skip the
 * one screen where people confirm what they are buying and see the delivery
 * threshold, and on a catalogue where most orders are cash-on-delivery that
 * confirmation step is what stops wrong-item deliveries.
 *
 * No "just added" state here: the drawer sliding in *is* the confirmation.
 */
export function BuyNowButton({
  line,
  className,
}: {
  line: Omit<CartLine, "qty">;
  className?: string;
}) {
  const { add, openCart } = useCart();

  return (
    <Button
      onClick={() => {
        add(line, 1);
        openCart();
      }}
      variant="primary"
      className={cn("h-11 w-full text-[13px]", className)}
      aria-label={`Buy ${line.title} now`}
    >
      <Zap aria-hidden className="size-4" />
      Buy Now
    </Button>
  );
}
