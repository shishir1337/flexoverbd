"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { useWishlist } from "@/components/wishlist/wishlist-context";
import type { Product } from "@/data/types";

/**
 * The saved list holds ids only, so the full catalogue is passed in from the
 * server and resolved here. That keeps the page a static payload while the
 * selection itself stays device-local.
 */
export function WishlistView({ catalogue }: { catalogue: Product[] }) {
  const { ids, hydrated, clear } = useWishlist();

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="aspect-3/4 rounded-card" />
        ))}
      </div>
    );
  }

  const byId = new Map(catalogue.map((p) => [p.id, p]));
  // Ids whose product has since vanished are dropped rather than rendered as
  // a broken tile.
  const saved = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-card border border-line bg-surface-2 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface">
          <Heart aria-hidden className="size-7 text-ink-4" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">
          Nothing saved yet
        </h2>
        <p className="mt-1 max-w-sm text-sm text-ink-2">
          Tap the heart on any product to keep it here while you decide.
        </p>
        <Link
          href="/categories"
          className={buttonStyles("primary", "md", "mt-6")}
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-3">
          <span className="font-bold text-ink tnum">{saved.length}</span>{" "}
          {saved.length === 1 ? "item" : "items"} saved
        </p>
        <button
          type="button"
          onClick={clear}
          className="min-h-9 text-sm font-semibold text-ink-3 tap hover:text-danger"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {saved.map((product) => (
          <WishlistCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

/**
 * A deliberately thin card. `ProductCard` is a Server Component (it stats the
 * filesystem for artwork), so it cannot be rendered from this client tree —
 * this shows the essentials and links through to the product.
 */
function WishlistCard({ product }: { product: Product }) {
  const { remove } = useWishlist();
  const price = product.flash?.price ?? product.price;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <Link
        href={`/product/${product.slug}`}
        className="flex flex-1 flex-col p-3 tap"
      >
        <p className="text-2xs font-semibold tracking-wide text-ink-3 uppercase">
          {product.brand}
        </p>
        <h2 className="mt-1 min-h-[2.5rem] text-[13px] leading-snug font-medium text-ink clamp-2 sm:text-sm">
          {product.title}
        </h2>
        <p data-price className="mt-2 text-base font-bold text-ink">
          ৳{price.toLocaleString("en-US")}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => remove(product.id)}
        className="flex min-h-11 items-center justify-center gap-1.5 border-t border-line text-sm font-semibold text-ink-3 tap hover:bg-danger-soft hover:text-danger"
      >
        <Heart aria-hidden className="size-4 fill-current" />
        Remove
      </button>
    </article>
  );
}
