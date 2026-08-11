"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";

/**
 * Confirmation for "Add to cart". Deliberately does not steal focus — it is an
 * `aria-live="polite"` region so screen readers announce it without
 * interrupting, and it clears itself after 3s.
 */
export function CartToast() {
  const { lastAdded, openCart } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [lastAdded]);

  return (
    <div
      aria-live="polite"
      className={cn(
        // Clears the mobile bottom nav (64px) plus the gesture bar.
        "pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]",
        "flex justify-center sm:inset-x-0 sm:bottom-6",
      )}
      style={{ zIndex: "var(--z-toast)" }}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[min(28rem,100%)] items-center gap-3 rounded-chip",
          "bg-scrim py-2.5 pr-2.5 pl-4 text-white shadow-pop",
          "transition-[opacity,transform] duration-300 ease-(--ease-out-soft)",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full bg-success"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug font-medium clamp-1">
          {lastAdded ? `${lastAdded.title} added to cart` : ""}
        </p>
        <button
          type="button"
          onClick={openCart}
          className="inline-flex min-h-9 shrink-0 items-center rounded-chip bg-surface/15 px-3 text-xs font-bold tap hover:bg-surface/25"
        >
          View
        </button>
      </div>
    </div>
  );
}
