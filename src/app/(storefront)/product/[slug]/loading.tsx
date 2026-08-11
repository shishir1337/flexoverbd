import { Skeleton } from "@/components/ui/primitives";

const SPEC_ROWS = ["a", "b", "c", "d", "e", "f"];
const BULLETS = ["a", "b", "c", "d"];

/** Mirrors the real layout's box model so the swap produces no layout shift. */
export default function ProductLoading() {
  return (
    <div className="container-page pt-3 pb-28 lg:pb-14">
      <Skeleton className="mb-3 h-3 w-56" />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square rounded-card" />
          <div className="hidden gap-2 sm:flex">
            {BULLETS.map((k) => (
              <Skeleton key={k} className="size-16 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-24 rounded-card" />
          <div className="space-y-3">
            <Skeleton className="h-11 w-40 rounded-btn" />
            {/* Mirrors BuyBox exactly — stacked below sm, side by side above.
                A row here would collapse into one 48px band and then shift the
                page 58px when the real, stacked buttons arrived. */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Skeleton className="h-12 w-full rounded-btn sm:flex-1" />
              <Skeleton className="h-12 w-full rounded-btn sm:flex-1" />
            </div>
            <Skeleton className="h-12 rounded-btn" />
          </div>
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          {BULLETS.map((k) => (
            <Skeleton key={k} className="h-4 w-3/4" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="overflow-hidden rounded-card border border-line">
            {SPEC_ROWS.map((k) => (
              <Skeleton key={k} className="h-10 rounded-none" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
