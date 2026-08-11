"use client";

import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart/cart-context";
import { useCommerce } from "@/components/settings-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn, formatBDT } from "@/lib/utils";
import { variantLabel } from "@/lib/variants";

export function CartDrawer() {
  const commerce = useCommerce();
  const { isOpen, closeCart, lines, subtotal, setQty, remove } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  const remaining = commerce.freeShippingThreshold - subtotal;
  const qualifies = remaining <= 0;
  const progress = Math.min(
    100,
    (subtotal / commerce.freeShippingThreshold) * 100,
  );

  return (
    <>
      {/* Scrim — 50% keeps the drawer clearly in front without hiding context */}
      <div
        onClick={closeCart}
        aria-hidden
        className={cn(
          "fixed inset-0 bg-scrim/50 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ zIndex: "var(--z-scrim)" }}
      />

      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        // `translate-x` keeps the animation on the compositor; the drawer is
        // never unmounted so the close transition can actually play out.
        className={cn(
          "fixed inset-y-0 right-0 flex w-[min(26rem,92vw)] flex-col bg-surface shadow-pop",
          "transition-transform duration-300 ease-(--ease-out-soft)",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        style={{ zIndex: "var(--z-drawer)" }}
        // While closed the drawer is still in the DOM (so it can animate out),
        // so `inert` keeps it out of the tab order and the a11y tree.
        inert={!isOpen}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <ShoppingBag aria-hidden className="size-5 text-brand-600" />
            Your Cart
            {lines.length > 0 && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-on tnum">
                {lines.length}
              </span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid size-10 place-items-center rounded-full text-ink-2 tap hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-surface-2">
              <ShoppingBag aria-hidden className="size-7 text-ink-4" />
            </div>
            <p className="text-base font-bold text-ink">Your cart is empty</p>
            <p className="text-sm text-ink-3">
              Browse our categories and add something you love.
            </p>
            <Button onClick={closeCart} variant="primary" className="mt-2">
              Start shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-line bg-surface-2 px-4 py-3">
              <p className="text-xs font-medium text-ink-2">
                {qualifies ? (
                  <span className="flex items-center gap-1.5 font-semibold text-success">
                    <Truck aria-hidden className="size-4" />
                    You&apos;ve unlocked free delivery
                  </span>
                ) : (
                  <>
                    Add{" "}
                    <span className="font-bold text-brand-on">
                      {formatBDT(remaining)}
                    </span>{" "}
                    more for free delivery
                  </>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-(--ease-out-soft)",
                    qualifies ? "bg-success" : "bg-brand-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-4">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  {/* `imageReady` is resolved on the server when the line is
                      created, so the client never requests a file that is
                      still a placeholder. */}
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {line.imageReady ? (
                      <Image
                        src={line.imageSrc}
                        alt={line.imageAlt}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-brand-soft to-surface">
                        <ShoppingBag
                          aria-hidden
                          className="size-6 text-ink-4/50"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={closeCart}
                      className="text-[13px] leading-snug font-medium text-ink clamp-2 hover:text-brand-on"
                    >
                      {line.title}
                    </Link>
                    {line.variant && (
                      <p className="text-xs text-ink-3">
                        {variantLabel(line.variant)}
                      </p>
                    )}
                    <p data-price className="text-sm font-bold text-ink">
                      {formatBDT(line.price)}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => setQty(line.id, line.qty - 1)}
                          aria-label={`Decrease quantity of ${line.title}`}
                          className="grid size-9 place-items-center rounded-l-lg text-ink-2 tap hover:bg-surface-2"
                        >
                          <Minus aria-hidden className="size-3.5" />
                        </button>
                        <span
                          aria-live="polite"
                          className="w-8 text-center text-sm font-semibold tnum"
                        >
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.id, line.qty + 1)}
                          aria-label={`Increase quantity of ${line.title}`}
                          className="grid size-9 place-items-center rounded-r-lg text-ink-2 tap hover:bg-surface-2"
                        >
                          <Plus aria-hidden className="size-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(line.id)}
                        aria-label={`Remove ${line.title} from cart`}
                        className="grid size-9 place-items-center rounded-lg text-ink-3 tap hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-4 pb-safe">
              <dl className="mb-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Subtotal</dt>
                  <dd data-price className="font-bold text-ink">
                    {formatBDT(subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Delivery</dt>
                  <dd className="font-semibold text-ink-3">
                    {qualifies ? (
                      <span className="text-success">Free</span>
                    ) : (
                      "Calculated at checkout"
                    )}
                  </dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonStyles("primary", "lg", "w-full")}
              >
                Proceed to Checkout
              </Link>
              <p className="mt-2 text-center text-xs text-ink-3">
                Cash on delivery available · {commerce.returnWindowDays} days
                easy return
              </p>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
