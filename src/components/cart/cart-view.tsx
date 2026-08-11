"use client";

import {
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { useCommerce, useZoneOptions } from "@/components/settings-provider";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { cn, formatBDT } from "@/lib/utils";
import { variantLabel } from "@/lib/variants";

export function CartView() {
  const commerce = useCommerce();
  const zoneOptions = useZoneOptions();
  const {
    lines,
    hydrated,
    subtotal,
    deliveryFee,
    total,
    zone,
    setZone,
    setQty,
    remove,
  } = useCart();

  // The cart lives in localStorage, so the server cannot know what is in it.
  // Showing a skeleton rather than an empty cart avoids telling a returning
  // shopper their basket is empty for a frame before it appears.
  if (!hydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0) return <EmptyCart />;

  const remaining = commerce.freeShippingThreshold - subtotal;
  const progress = Math.min(
    100,
    (subtotal / commerce.freeShippingThreshold) * 100,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div>
        {deliveryFee > 0 && (
          <div className="mb-4 rounded-card border border-brand-200 bg-brand-soft p-3.5">
            <p className="text-sm text-ink-2">
              Add{" "}
              <span className="font-bold text-brand-on">
                {formatBDT(remaining)}
              </span>{" "}
              more and delivery is free.
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-(--ease-out-soft)"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
              <Link
                href={`/product/${line.slug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:size-24"
              >
                {line.imageReady ? (
                  <Image
                    src={line.imageSrc}
                    alt={line.imageAlt}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-linear-to-br from-brand-soft to-surface">
                    <ShoppingBag aria-hidden className="size-6 text-ink-4/50" />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/product/${line.slug}`}
                  className="text-sm font-medium text-ink clamp-2 hover:text-brand-on sm:text-base"
                >
                  {line.title}
                </Link>
                {line.variant && (
                  <p className="mt-0.5 text-xs text-ink-3">
                    {variantLabel(line.variant)}
                  </p>
                )}
                <p data-price className="mt-1 text-base font-bold text-ink">
                  {formatBDT(line.price)}
                </p>

                <div className="mt-auto flex items-center justify-between gap-3 pt-2">
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
                      className="w-9 text-center text-sm font-semibold tnum"
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

                  <div className="flex items-center gap-3">
                    <span
                      data-price
                      className="text-sm font-bold text-ink tnum sm:text-base"
                    >
                      {formatBDT(line.price * line.qty)}
                    </span>
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
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <Link href="/categories" className={buttonStyles("secondary", "md")}>
            Continue shopping
          </Link>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28">
        <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-ink">Order summary</h2>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-ink">
              Delivery area
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {zoneOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setZone(option.key)}
                  aria-pressed={zone === option.key}
                  className={cn(
                    "rounded-btn border px-2.5 py-2 text-left tap transition-colors",
                    zone === option.key
                      ? "border-brand-500 bg-brand-soft"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[13px] font-bold",
                      zone === option.key ? "text-brand-on" : "text-ink",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    {formatBDT(option.fee)} · {option.eta}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal</dt>
              <dd data-price className="font-semibold text-ink">
                {formatBDT(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Delivery</dt>
              <dd className="font-semibold">
                {deliveryFee === 0 ? (
                  <span className="text-success">Free</span>
                ) : (
                  <span data-price className="text-ink">
                    {formatBDT(deliveryFee)}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-extrabold text-ink">Total</dt>
              <dd data-price className="font-extrabold text-ink">
                {formatBDT(total)}
              </dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className={buttonStyles("primary", "lg", "mt-4 w-full")}
          >
            Proceed to Checkout
          </Link>

          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            <Assurance icon={Wallet}>
              Cash on delivery — pay when it arrives
            </Assurance>
            <Assurance icon={Truck}>Delivered in all 64 districts</Assurance>
            <Assurance icon={ShieldCheck}>
              {commerce.returnWindowDays}-day easy return
            </Assurance>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Assurance({
  icon: Icon,
  children,
}: {
  icon: typeof Truck;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 text-xs text-ink-2">
      <Icon aria-hidden className="size-4 shrink-0 text-brand-600" />
      {children}
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center rounded-card border border-line bg-surface-2 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface">
        <ShoppingBag aria-hidden className="size-7 text-ink-4" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-ink">
        Your cart is empty
      </h2>
      <p className="mt-1 max-w-sm text-sm text-ink-2">
        Once you add something it will show up here, and stay saved on this
        device until you check out.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/categories" className={buttonStyles("primary", "md")}>
          Start shopping
        </Link>
        <Link href="/offers" className={buttonStyles("secondary", "md")}>
          See today&apos;s offers
        </Link>
      </div>
    </div>
  );
}
