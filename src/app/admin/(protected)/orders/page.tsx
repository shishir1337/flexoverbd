import { ChevronDown, PackageSearch, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  listOrders,
  ORDER_STATUSES,
  type OrderSort,
  STATUS_LABEL,
} from "@/server/services/admin/orders";
import { OrdersTable } from "./orders-table";

/**
 * Blocking route, deliberately.
 *
 * Every admin screen is per-user, behind auth, and reads live operational
 * data — there is no meaningful static shell to stream first, and rendering
 * one would only flash empty chrome at staff. `instant = false` tells Next
 * this navigation is expected to wait on the server rather than paint
 * immediately.
 */
export const instant = false;

export const metadata: Metadata = { title: "Orders" };

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DATE_RANGES = [
  { label: "All time", days: undefined },
  { label: "Today", days: "1" },
  { label: "7 days", days: "7" },
  { label: "30 days", days: "30" },
] as const;

const SORTS = [
  { key: "newest", label: "Newest" },
  // The order waiting longest is the one whose customer is about to ring.
  { key: "oldest", label: "Oldest" },
  { key: "highest", label: "Largest" },
] as const;

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold text-2xs text-ink-4 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-chip px-2 py-1 font-medium text-xs tap",
        active
          ? "bg-brand-soft font-semibold text-brand-on"
          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export default async function AdminOrdersPage(
  props: PageProps<"/admin/orders">,
) {
  // Explicitly request-time: these read live operational data that must never
  // be served from a prerendered shell.
  await connection();

  await requirePermission({ order: ["read"] });

  const sp = await props.searchParams;
  const status =
    typeof sp.status === "string" &&
    ORDER_STATUSES.includes(sp.status as OrderStatus)
      ? (sp.status as OrderStatus)
      : undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Number(sp.page) || 1;
  const days = Number(sp.days) || undefined;
  // Unfiltered means the active queue. `?all=1` is the explicit escape to the
  // full archive, so the default view is the day's work.
  const showAll = sp.all === "1";
  const active = !status && !showAll;
  const zoneId = typeof sp.zone === "string" ? sp.zone : undefined;
  const sort =
    sp.sort === "oldest" || sp.sort === "highest" || sp.sort === "lowest"
      ? (sp.sort as OrderSort)
      : "newest";

  const [{ orders, total, pageCount, countsByStatus }, zones] =
    await Promise.all([
      listOrders({ status, q, page, days, zoneId, sort, active }),
      prisma.deliveryZone.findMany({
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      }),
    ]);

  // How many of the folded-away filters are actually doing something.
  const refinements =
    (days ? 1 : 0) + (zoneId ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      status,
      all: showAll ? "1" : undefined,
      q,
      days: days ? String(days) : undefined,
      zone: zoneId,
      sort: sort === "newest" ? undefined : sort,
      ...next,
    };
    for (const [k, v] of Object.entries(merged))
      if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Orders"
        subtitle={
          status
            ? `${total} ${STATUS_LABEL[status].toLowerCase()}`
            : active
              ? `${total} still in flight — placed, confirmed, packed or on the way`
              : `${total} ${total === 1 ? "order" : "orders"} in total`
        }
      />

      {/* Filters are links, not client state — a filtered queue stays
          shareable and survives a refresh, which matters when two staff are
          working the same list. */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link
          href={href({ status: undefined, all: undefined, page: undefined })}
          className={cn(
            "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
            active
              ? "border-brand-500 bg-brand-soft text-brand-on"
              : "border-line text-ink-2 hover:bg-surface-2",
          )}
        >
          Needs action
        </Link>
        <Link
          href={href({ status: undefined, all: "1", page: undefined })}
          className={cn(
            "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
            showAll && !status
              ? "border-brand-500 bg-brand-soft text-brand-on"
              : "border-line text-ink-2 hover:bg-surface-2",
          )}
        >
          All orders
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, page: undefined })}
            className={cn(
              "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
              status === s
                ? "border-brand-500 bg-brand-soft text-brand-on"
                : "border-line text-ink-2 hover:bg-surface-2",
            )}
          >
            {STATUS_LABEL[s]}
            {countsByStatus[s] ? (
              <span className="ml-1.5 text-ink-3 tnum">
                {countsByStatus[s]}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <form method="GET" className="mt-3 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {days && <input type="hidden" name="days" value={String(days)} />}
        {zoneId && <input type="hidden" name="zone" value={zoneId} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Order number, name or phone"
          className="h-10 w-full max-w-sm rounded-btn border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className={adminButton("secondary", "md", "shrink-0")}
        >
          Search
        </button>
      </form>

      {/* Date window, zone and sort, folded away by default.
          These were three permanent rows above the queue — roughly a phone
          screen of chrome before the first order. They are refinements, used
          occasionally; the status chips and the search box are the daily
          controls and stay out. Open whenever one is actually set, so a
          filtered list never hides why it looks short.

          Links rather than client state, for the same reason as the status
          chips: a filtered queue two staff are working stays shareable and
          survives a refresh. */}
      <details
        open={Boolean(days || zoneId || sort !== "newest")}
        className="group mt-3 rounded-card border border-line bg-surface"
      >
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 font-semibold text-ink-2 text-sm tap">
          <SlidersHorizontal aria-hidden className="size-4 text-ink-4" />
          Date, zone and sort
          {refinements > 0 && (
            <span className="rounded-chip bg-brand-soft px-1.5 py-0.5 font-bold text-2xs text-brand-on tnum">
              {refinements}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className="ml-auto size-4 text-ink-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-t px-3 py-2.5">
          <FilterGroup label="When">
            {DATE_RANGES.map((r) => (
              <FilterLink
                key={r.label}
                href={href({ days: r.days, page: undefined })}
                active={days === (r.days ? Number(r.days) : undefined)}
              >
                {r.label}
              </FilterLink>
            ))}
          </FilterGroup>

          {zones.length > 0 && (
            <FilterGroup label="Zone">
              <FilterLink
                href={href({ zone: undefined, page: undefined })}
                active={!zoneId}
              >
                All
              </FilterLink>
              {zones.map((z) => (
                <FilterLink
                  key={z.id}
                  href={href({ zone: z.id, page: undefined })}
                  active={zoneId === z.id}
                >
                  {z.name}
                </FilterLink>
              ))}
            </FilterGroup>
          )}

          <FilterGroup label="Sort">
            {SORTS.map((o) => (
              <FilterLink
                key={o.key}
                href={href({ sort: o.key, page: undefined })}
                active={sort === o.key}
              >
                {o.label}
              </FilterLink>
            ))}
          </FilterGroup>
        </div>
      </details>

      <div className="mt-4">
        {orders.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No orders here"
            body={
              q || status
                ? "Try clearing the filters above."
                : "Orders will appear here as customers place them."
            }
          />
        ) : (
          <OrdersTable
            filters={{ status, q, days, zoneId, sort }}
            orders={orders.map((o) => ({
              id: o.id,
              number: o.number,
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              district: o.district.name,
              status: o.status,
              total: o.total,
              itemCount: o._count.items,
              // Formatted on the server so every staff member sees the store's
              // clock, not whatever their own device is set to.
              placedLabel: dateLabel(o.placedAt),
              // Measured server-side: a client-side clock would render one
              // value on the server and another on hydration.
              ageHours: (Date.now() - o.placedAt.getTime()) / 3_600_000,
              customerIsRisky: o.customerIsRisky,
            }))}
          />
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={href({ page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={cn(
              "rounded-btn border border-line px-4 py-2 font-semibold text-sm tap",
              page <= 1
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-2",
            )}
          >
            Previous
          </Link>
          <span className="text-ink-3 text-sm tnum">
            Page {page} of {pageCount}
          </span>
          <Link
            href={href({ page: String(page + 1) })}
            aria-disabled={page >= pageCount}
            className={cn(
              "rounded-btn border border-line px-4 py-2 font-semibold text-sm tap",
              page >= pageCount
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-2",
            )}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
