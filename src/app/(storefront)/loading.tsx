import { ProductCardSkeleton } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/primitives";

// Stable keys for the placeholder loops — these lists never reorder, but an
// index key would still make React reconcile them positionally.
const keys = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

const SCROLLER_KEYS = keys("scroller", 9);
const TRUST_KEYS = keys("trust", 4);
const CARD_KEYS = keys("card", 8);

/**
 * Mirrors the real homepage box model exactly — same aspect ratios, same
 * gutters, same grid — so the swap to real content produces no layout shift.
 */
export default function HomeLoading() {
  return (
    <div className="space-y-8 pb-10 sm:space-y-12">
      {/* Hero */}
      <div className="container-page pt-3 sm:pt-4">
        <Skeleton className="aspect-square rounded-card sm:aspect-16/9 lg:aspect-[21/9]" />
      </div>

      {/* Category scroller */}
      <div className="container-page flex gap-4 overflow-hidden sm:gap-5">
        {SCROLLER_KEYS.map((key) => (
          <div
            key={key}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <Skeleton className="size-16 rounded-full sm:size-20" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>

      {/* Trust strip */}
      <div className="container-page">
        <div className="grid grid-cols-2 gap-3 rounded-card border border-line p-3 lg:grid-cols-4 lg:p-4">
          {TRUST_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2.5">
              <Skeleton className="size-10 shrink-0 rounded-full sm:size-11" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-full max-w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flash sale */}
      <div className="container-page">
        <Skeleton className="h-72 rounded-card sm:h-96" />
      </div>

      {/* Product grid */}
      <div className="container-page">
        <div className="mb-4 space-y-2 sm:mb-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-56 sm:h-8 sm:w-72" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {CARD_KEYS.map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}
