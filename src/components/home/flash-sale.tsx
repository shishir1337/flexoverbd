import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { Rail } from "@/components/ui/primitives";
import { getFlashSaleProducts } from "@/server/services/catalog";
import { CountdownTimer } from "./countdown-timer";

/**
 * Rendered as a rail rather than a grid on purpose: a horizontal scroller
 * signals "there is more, keep looking" and keeps the sections below within
 * reach, which matters when almost every visitor is on a phone.
 */
export async function FlashSale() {
  const items = await getFlashSaleProducts();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="flash-sale-heading" className="container-page">
      <div className="overflow-hidden rounded-card bg-linear-to-br from-brand-500 via-brand-500 to-brand-600 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-surface/20 backdrop-blur-sm">
              <Zap
                aria-hidden
                className="size-5 fill-white text-white"
                strokeWidth={2}
              />
            </span>
            <div>
              <h2
                id="flash-sale-heading"
                className="text-base leading-tight font-extrabold text-white sm:text-xl"
              >
                Flash Sale
              </h2>
              <p className="text-[11px] text-white/85 sm:text-xs">
                Today only · while stock lasts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-white/90 sm:inline">
              Ends in
            </span>
            <CountdownTimer />
          </div>
        </div>

        <Rail label="flash sale products" pad="panel">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showFlashProgress
              className="rail-item w-[46vw] max-w-52 border-transparent sm:w-48 lg:w-56"
            />
          ))}

          <Link
            href="/offers"
            className="rail-item flex w-32 flex-col items-center justify-center gap-2 rounded-card bg-surface/15 text-white backdrop-blur-sm tap transition-colors hover:bg-surface/25 sm:w-36"
          >
            <span className="grid size-10 place-items-center rounded-full bg-surface/25">
              <ArrowRight aria-hidden className="size-5" />
            </span>
            <span className="text-sm font-bold">See all deals</span>
          </Link>
        </Rail>
      </div>
    </section>
  );
}
