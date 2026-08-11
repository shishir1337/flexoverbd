"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";

export function CartButton({ className }: { className?: string }) {
  const { count, hydrated, openCart } = useCart();
  const showBadge = hydrated && count > 0;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={
        showBadge
          ? `Open cart, ${count} item${count === 1 ? "" : "s"}`
          : "Open cart"
      }
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full text-ink tap",
        "transition-colors duration-200 hover:bg-surface-2",
        className,
      )}
    >
      <ShoppingCart aria-hidden className="size-5.5" strokeWidth={1.9} />
      {showBadge && (
        <span
          className={cn(
            "absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-brand-500 px-1",
            "text-[10px] leading-4.5 font-bold text-white tnum ring-2 ring-white",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
