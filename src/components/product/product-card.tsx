import { SlidersHorizontal, Truck } from "lucide-react";
import Link from "next/link";
import { WishlistButton } from "@/components/product/wishlist-button";
import { buttonStyles } from "@/components/ui/button";
import { Badge, Price, Rating, Skeleton } from "@/components/ui/primitives";
import type { Product } from "@/data/types";
import { publicFileExists } from "@/lib/public-files";
import { cn, compactCount, discountPercent } from "@/lib/utils";
import { defaultVariant, hasOptions, variantLineId } from "@/lib/variants";
import { categoryIcon, Media } from "../ui/media";
import { AddToCartButton } from "./add-to-cart-button";
import { BuyNowButton } from "./buy-now-button";

const BADGE_LABEL: Record<NonNullable<Product["badge"]>, string> = {
  new: "New",
  bestseller: "Bestseller",
  limited: "Limited",
  restock: "Back in stock",
};

/**
 * `sizes` matters more than anything else here for mobile weight: the grid is
 * 2-up on phones, so a card image is only ~46vw — without this hint Next would
 * ship a full-width asset.
 */
const CARD_SIZES =
  "(min-width: 1280px) 240px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw";

export function ProductCard({
  product,
  className,
  priority = false,
  showFlashProgress = false,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
  /** Renders the "x% claimed" bar used in the flash-sale rail. */
  showFlashProgress?: boolean;
}) {
  const effectivePrice = product.flash?.price ?? product.price;
  const off = discountPercent(effectivePrice, product.compareAt);
  const lowStock = product.stock <= 20;
  const needsChoice = hasOptions(product);
  const variant = defaultVariant(product);

  // Built once and handed to both buttons so they can never disagree about
  // what is being added. Single-value options (a wok that only comes in
  // black) are applied here too, so this line merges with the same product
  // added from its detail page instead of splitting into two cart rows.
  const line = {
    id: variantLineId(product.id, variant),
    productId: product.id,
    variant: variant.colour || variant.size ? variant : undefined,
    slug: product.slug,
    title: product.title,
    price: effectivePrice,
    compareAt: product.compareAt,
    imageSrc: product.image.src,
    imageAlt: product.image.alt,
    imageReady: publicFileExists(product.image.src),
    freeDelivery: product.freeDelivery,
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface",
        "transition-shadow duration-200 ease-(--ease-out-soft) hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <Media
          asset={product.image}
          sizes={CARD_SIZES}
          priority={priority}
          icon={categoryIcon(product.category)}
          className="transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-105"
        />

        {/* Whole-card link. Sits under the interactive controls so Add to cart
            and Wishlist stay clickable. */}
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0 z-10"
          aria-label={product.title}
        >
          <span className="sr-only">View {product.title}</span>
        </Link>

        <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
          {off > 0 && <Badge tone="danger">-{off}%</Badge>}
          {product.badge && (
            <Badge tone={product.badge === "limited" ? "dark" : "brand"}>
              {BADGE_LABEL[product.badge]}
            </Badge>
          )}
        </div>

        <WishlistButton
          productId={product.id}
          title={product.title}
          className="absolute top-2 right-2 z-20"
        />

        {lowStock && (
          <div className="absolute right-2 bottom-2 left-2 z-20">
            <Badge tone="neutral" className="shadow-sm">
              Only {product.stock} left
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <p className="text-2xs font-semibold tracking-wide text-ink-3 uppercase clamp-1">
          {product.brand}
        </p>

        <h3 className="min-h-[2.25rem] text-[13px] leading-[1.35] font-medium text-ink clamp-2 sm:min-h-[2.5rem] sm:text-sm">
          <Link href={`/product/${product.slug}`} className="relative z-20">
            {product.title}
          </Link>
        </h3>

        <div className="flex items-center gap-2">
          <Rating value={product.rating} count={product.reviewCount} />
          <span className="hidden text-xs text-ink-3 sm:inline">
            · {compactCount(product.sold)} sold
          </span>
        </div>

        <Price price={effectivePrice} compareAt={product.compareAt} />

        {showFlashProgress && product.flash && (
          <div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-brand-100"
              role="progressbar"
              aria-valuenow={product.flash.claimedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${product.flash.claimedPercent}% of stock claimed`}
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-500 to-danger"
                style={{ width: `${product.flash.claimedPercent}%` }}
              />
            </div>
            <p className="mt-1 text-2xs font-semibold text-danger">
              {product.flash.claimedPercent}% claimed
            </p>
          </div>
        )}

        {product.freeDelivery && !showFlashProgress && (
          <p className="flex items-center gap-1 text-2xs font-semibold text-success">
            <Truck aria-hidden className="size-3.5" />
            Free delivery
          </p>
        )}

        <div className="relative z-20 mt-auto flex flex-col gap-1.5 pt-1.5">
          {/* A product with a real choice to make cannot be added from a
              grid — there is no size to attach, and an order with no size is
              unpickable. Both buttons collapse into a route to the detail
              page rather than one of them silently doing the wrong thing. */}
          {needsChoice ? (
            <Link
              href={`/product/${product.slug}`}
              className={buttonStyles(
                "secondary",
                "md",
                "h-11 w-full text-[13px]",
              )}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Choose options
            </Link>
          ) : (
            <>
              {/* Stacked, not side by side: a card is ~139px of usable width
                  at 360px, so two labelled buttons on one row would each get
                  ~65px and truncate. Buy Now takes the primary fill and Add
                  to Cart steps down to secondary — one clear CTA per card. */}
              <AddToCartButton variant="secondary" line={line} />
              <BuyNowButton line={line} />
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Matches ProductCard's exact box model so swapping in real data cannot shift layout. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
    >
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-col gap-2 p-2.5 sm:p-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-20" />
        {/* Two bars: the card now stacks Add to Cart + Buy Now, and a
            single-bar skeleton would shift the grid by 50px on hydration. */}
        <Skeleton className="mt-1.5 h-11 w-full rounded-btn" />
        <Skeleton className="h-11 w-full rounded-btn" />
      </div>
    </div>
  );
}
