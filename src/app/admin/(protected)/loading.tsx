import { Skeleton } from "@/components/ui/primitives";

/**
 * Shown while any admin screen loads.
 *
 * Every route under here is `instant = false` — blocking, because the data is
 * per-user and operational — which meant navigation showed the previous page
 * frozen until the server answered, with no sign anything was happening. One
 * skeleton at the group level covers all of them, shaped like the header and
 * list that most of these screens actually are.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-5">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="mt-2 h-4 w-72 rounded" />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-24 rounded-card" />
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton key={k} className="h-16 rounded-card" />
        ))}
      </div>
    </div>
  );
}
