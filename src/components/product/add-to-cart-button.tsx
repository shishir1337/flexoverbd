"use client";

import { Check, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { type CartLine, useCart } from "@/components/cart/cart-context";
import { trackAddToCart } from "@/components/meta-events";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  line: Omit<CartLine, "qty">;
  /** `bar` sits at the bottom of a card, `fab` overlaps the image corner. */
  shape?: "bar" | "fab";
  /** Cards pair this with Buy Now, so it steps down to the secondary role. */
  variant?: ButtonVariant;
  className?: string;
};

export function AddToCartButton({
  line,
  shape = "bar",
  variant = "primary",
  className,
}: Props) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // Confirmation state auto-clears; the ref-free timeout is cleaned up so a
  // fast scroll that unmounts the card cannot set state on a dead component.
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(t);
  }, [justAdded]);

  function handleAdd() {
    add(line, 1);
    setJustAdded(true);
    // Browser-only: a cart add never reaches the server, so there is nothing
    // server-side to report it from. See meta-events.tsx.
    trackAddToCart({
      slug: line.slug,
      name: line.title,
      price: line.price,
      qty: 1,
    });
  }

  if (shape === "fab") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`Add ${line.title} to cart`}
        className={cn(
          // The visual control is 36px but `after` stretches the hit area to
          // the 44px minimum without disturbing the card layout.
          "relative grid size-9 place-items-center rounded-full text-white shadow-brand tap",
          "transition-[background-color,transform] duration-200 ease-(--ease-out-soft) active:scale-90",
          "after:absolute after:-inset-1 after:content-['']",
          justAdded ? "bg-success" : "bg-brand-600 hover:bg-brand-700",
          className,
        )}
      >
        {justAdded ? (
          <Check aria-hidden className="size-4.5" strokeWidth={2.5} />
        ) : (
          <Plus aria-hidden className="size-4.5" strokeWidth={2.5} />
        )}
      </button>
    );
  }

  return (
    <Button
      onClick={handleAdd}
      variant={justAdded ? "soft" : variant}
      className={cn(
        "h-11 w-full text-[13px]",
        justAdded && "bg-success-soft text-success",
        className,
      )}
      aria-label={`Add ${line.title} to cart`}
    >
      {justAdded ? (
        <>
          <Check aria-hidden className="size-4" strokeWidth={2.5} />
          Added
        </>
      ) : (
        <>
          <ShoppingBag aria-hidden className="size-4" />
          Add to Cart
        </>
      )}
    </Button>
  );
}
