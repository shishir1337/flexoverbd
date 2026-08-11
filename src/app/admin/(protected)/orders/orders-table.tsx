"use client";

import {
  AlertTriangle,
  Check,
  Download,
  Loader2,
  Printer,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Chip } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  ALLOWED_TRANSITIONS,
  NEXT_STEP,
  ORDER_STATUSES,
  STALE_AFTER_HOURS,
  STATUS_LABEL,
} from "@/lib/order-status";
import { cn, formatBDT } from "@/lib/utils";
import {
  bulkUpdateOrderStatus,
  updateOrderStatus,
} from "@/server/services/admin/order-actions";
import { exportOrdersCsv } from "@/server/services/admin/order-export";
import type { OrderFilters } from "@/server/services/admin/orders";

export type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  district: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  placedLabel: string;
  /** Hours since the order was placed, measured on the server so the label
   *  cannot drift between render and hydration. */
  ageHours: number;
  /** Has refused parcels before — see getCustomerHistory. */
  customerIsRisky: boolean;
};

/** "3h" / "2d" — how long this has been sitting, in as few characters as fit. */
function age(hours: number) {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Is this order late for its current step?
 *
 * Only meaningful where the delay is ours. A parcel with a courier for three
 * days is the courier's clock, not ours, and colouring it red every morning
 * teaches staff to ignore the colour.
 */
function isStale(row: OrderRow) {
  const limit = STALE_AFTER_HOURS[row.status];
  return limit !== undefined && row.ageHours >= limit;
}

const STATUS_TONE: Record<
  OrderStatus,
  "brand" | "success" | "warn" | "danger" | "neutral"
> = {
  PLACED: "warn",
  CONFIRMED: "brand",
  PACKED: "brand",
  SHIPPED: "brand",
  DELIVERED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
};

/**
 * The order queue.
 *
 * Selection and bulk status changes exist because the work is genuinely
 * batched: ring twenty customers, mark the ones who answered as confirmed;
 * hand a stack to the courier, mark them all shipped. One page load per order
 * is what made the old list unusable for a real day's work.
 *
 * The bulk menu offers every move at least one selected order can make, with
 * the count on the button, so a mixed selection still gets useful actions and
 * you can see exactly how many each will move. The server re-checks each order
 * individually and reports anything it skipped.
 */
export function OrdersTable({
  orders,
  filters,
}: {
  orders: OrderRow[];
  /** Mirrors what is on screen, so an export matches the visible list. */
  filters: OrderFilters;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  /** The row mid-flight, so only its own button shows a busy state. */
  const [movingNumber, setMovingNumber] = useState<string | null>(null);

  /**
   * Advance one order from the list.
   *
   * No confirmation: this is the loop staff run dozens of times a day, and a
   * dialog on every parcel is a dialog people stop reading. The move is
   * recorded in the order's history with who made it, and the status can be
   * moved back from the detail page — the bulk bar keeps its confirmation
   * because "mark 40 orders packed" is a different kind of mistake.
   */
  function advance(row: OrderRow, to: OrderStatus, label: string) {
    setMovingNumber(row.number);
    startTransition(async () => {
      try {
        const result = await updateOrderStatus({
          number: row.number,
          status: to,
        });
        if (!result.ok) {
          toast({ tone: "error", message: result.error });
          return;
        }
        toast({
          tone: "success",
          message: `${row.number} marked ${label.toLowerCase()}.`,
        });
        router.refresh();
      } finally {
        setMovingNumber(null);
      }
    });
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0 && !allSelected;

  const chosen = orders.filter((o) => selected.has(o.number));

  /**
   * Every move at least one selected order can make, with how many it applies
   * to.
   *
   * This used to intersect: only moves *all* selected orders could make. The
   * reasoning was that the menu should never offer something that would fail
   * for half the selection — but on any mixed list the intersection collapses
   * to Cancel, or to nothing at all, and staff got "No status applies to all
   * of these" for a perfectly ordinary selection. A queue where the bulk bar
   * refuses to act is a queue where nobody uses the bulk bar.
   *
   * The union is safe because the server runs each order through
   * `updateOrderStatus` individually and reports what it skipped, and it is
   * honest because the count is on the button: "Pack 3" moves exactly the
   * three that can be packed and leaves the rest alone.
   */
  const availableMoves = ORDER_STATUSES.map((status) => ({
    status,
    count: chosen.filter((o) => ALLOWED_TRANSITIONS[o.status].includes(status))
      .length,
  })).filter((m) => m.count > 0);

  function toggle(number: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === orders.length
        ? new Set()
        : new Set(orders.map((o) => o.number)),
    );
  }

  async function applyBulk(status: OrderStatus, count: number) {
    const ok = await confirm({
      title: `Mark ${count} ${count === 1 ? "order" : "orders"} as ${STATUS_LABEL[status].toLowerCase()}?`,
      body:
        status === "CANCELLED"
          ? "Cancelling returns every item to stock and cannot be undone from here."
          : "Customers see this on their tracking page straight away.",
      confirmLabel: STATUS_LABEL[status],
      destructive: status === "CANCELLED",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await bulkUpdateOrderStatus({
        numbers: chosen.map((o) => o.number),
        status,
      });

      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }

      setSelected(new Set());

      // Partial success is reported as such rather than as a flat "done" —
      // silently skipping half a batch is how a parcel goes out unpacked.
      if (result.skipped.length > 0) {
        toast({
          tone: result.moved === 0 ? "error" : "info",
          message: `${result.moved} moved, ${result.skipped.length} skipped — ${result.skipped[0].reason}`,
        });
      } else {
        toast({
          tone: "success",
          message: `${result.moved} ${result.moved === 1 ? "order" : "orders"} marked ${STATUS_LABEL[status].toLowerCase()}.`,
        });
      }
      router.refresh();
    });
  }

  async function download() {
    setExporting(true);
    try {
      const result = await exportOrdersCsv(filters);
      if (!result.ok) {
        toast({ tone: "error", message: "Could not build the export." });
        return;
      }
      const url = URL.createObjectURL(
        new Blob([result.csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `flexover-orders-${filters.status?.toLowerCase() ?? "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        tone: "success",
        message: `${result.count} ${result.count === 1 ? "order" : "orders"} exported.`,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {dialog}

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={download}
          disabled={exporting || orders.length === 0}
          className={adminButton("secondary")}
        >
          <Download aria-hidden className="size-4" />
          {exporting ? "Preparing…" : "Export CSV"}
        </button>
      </div>

      {/* Bulk bar. Sticks to the bottom so it stays reachable however far down
          the list the selection was made — on a phone that is the difference
          between usable and not. */}
      {selected.size > 0 && (
        <div className="sticky bottom-3 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-card border border-brand-200 bg-brand-soft p-2.5 shadow-card-hover">
          <span className="px-1 font-semibold text-brand-on text-sm tnum">
            {selected.size} selected
          </span>

          {availableMoves.length === 0 ? (
            <span className="text-ink-3 text-sm">
              These are all finished — nothing left to move.
            </span>
          ) : (
            availableMoves.map(({ status, count }) => (
              <button
                key={status}
                type="button"
                onClick={() => applyBulk(status, count)}
                disabled={pending}
                title={
                  count === selected.size
                    ? undefined
                    : `Applies to ${count} of the ${selected.size} selected`
                }
                className={cn(
                  "h-10 rounded-btn px-3 font-semibold text-sm tap disabled:opacity-40",
                  status === "CANCELLED"
                    ? "border border-danger text-danger hover:bg-danger-soft"
                    : "bg-brand-600 text-white hover:bg-brand-700",
                )}
              >
                {STATUS_LABEL[status]}
                {/* The count is the honesty: a mixed selection shows exactly
                    how many this button will actually move. */}
                {count < selected.size && (
                  <span className="ml-1.5 opacity-70 tnum">{count}</span>
                )}
              </button>
            ))
          )}

          {/* Opened in a new tab rather than navigated to: staff are mid-way
              through a selection, and losing the list to go and print would
              mean rebuilding it afterwards. */}
          <a
            href={`/admin/orders/slips?n=${chosen.map((o) => o.number).join(",")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={adminButton("secondary")}
          >
            <Printer aria-hidden className="size-4" />
            Print slips
          </a>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className={adminButton("ghost", "icon", "ml-auto")}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      {/* Table from md up; the same rows as cards below that, because a
          five-column table on a 360px phone is a horizontal scroll nobody
          wins. */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-line border-b bg-surface-2 text-left">
            <tr className="text-ink-3 text-xs uppercase tracking-wide">
              <th className="w-10 px-3 py-3">
                <input
                  // `indeterminate` is a DOM property with no attribute
                  // equivalent, so it has to be set through a ref rather than
                  // rendered. It is what shows a partial selection as a dash
                  // instead of an empty box.
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all orders on this page"
                  className="size-4 accent-brand-600"
                />
              </th>
              <th className="px-4 py-3 font-bold">Order</th>
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">District</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Total</th>
              <th className="w-44 px-3 py-3 text-right font-bold">Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr
                key={o.id}
                className={cn(
                  "hover:bg-surface-2",
                  selected.has(o.number) && "bg-brand-soft/40",
                )}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.number)}
                    onChange={() => toggle(o.number)}
                    aria-label={`Select order ${o.number}`}
                    className="size-4 accent-brand-600"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.number}`}
                    className="font-bold text-brand-on tnum hover:underline"
                  >
                    {o.number}
                  </Link>
                  <span className="block text-2xs text-ink-3">
                    <span
                      title={o.placedLabel}
                      className={cn(
                        "font-semibold tnum",
                        isStale(o) ? "text-danger" : "text-ink-3",
                      )}
                    >
                      {age(o.ageHours)}
                    </span>{" "}
                    · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className="text-ink">{o.customerName}</span>
                    {o.customerIsRisky && (
                      <span
                        title="Has refused parcels before — worth confirming by phone"
                        className="inline-flex shrink-0 text-warn"
                      >
                        <AlertTriangle aria-hidden className="size-3.5" />
                        <span className="sr-only">
                          Has refused parcels before
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="block text-2xs text-ink-3 tnum">
                    {o.customerPhone}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-2">{o.district}</td>
                <td className="px-4 py-3">
                  <Chip tone={STATUS_TONE[o.status]}>
                    {STATUS_LABEL[o.status]}
                  </Chip>
                </td>
                <td className="px-4 py-3 text-right font-bold text-ink tnum">
                  {formatBDT(o.total)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <RowAction
                      row={o}
                      busy={movingNumber === o.number}
                      disabled={pending}
                      onAdvance={advance}
                    />
                    <Link
                      href={`/admin/orders/${o.number}/slip`}
                      target="_blank"
                      aria-label={`Packing slip for ${o.number}`}
                      className="grid size-9 shrink-0 place-items-center rounded-btn text-ink-3 tap hit-touch hover:bg-surface-2 hover:text-ink"
                    >
                      <Printer aria-hidden className="size-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {orders.map((o) => (
          <li
            key={o.id}
            className={cn(
              "rounded-card border bg-surface p-3",
              selected.has(o.number)
                ? "border-brand-500 bg-brand-soft/40"
                : "border-line",
            )}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(o.number)}
                onChange={() => toggle(o.number)}
                aria-label={`Select order ${o.number}`}
                className="mt-1 size-4 shrink-0 accent-brand-600"
              />
              <Link
                href={`/admin/orders/${o.number}`}
                className="min-w-0 flex-1 tap"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-brand-on text-sm tnum">
                    {o.number}
                  </span>
                  <Chip tone={STATUS_TONE[o.status]}>
                    {STATUS_LABEL[o.status]}
                  </Chip>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 truncate text-ink text-sm">
                  {o.customerIsRisky && (
                    <AlertTriangle
                      aria-label="Has refused parcels before"
                      className="size-3.5 shrink-0 text-warn"
                    />
                  )}
                  {o.customerName} · {o.district}
                </span>
                <span className="block text-2xs text-ink-3 tnum">
                  {o.customerPhone} ·{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      isStale(o) ? "text-danger" : "text-ink-3",
                    )}
                  >
                    {age(o.ageHours)}
                  </span>
                </span>
              </Link>
              <span className="shrink-0 font-bold text-ink text-sm tnum">
                {formatBDT(o.total)}
              </span>
            </div>

            {/* The same one-tap step as the table. This is the view staff
                actually use while packing, so leaving it out would mean the
                phone is the slower device for the job it is used for. */}
            <div className="mt-2.5 flex items-center gap-1.5 border-line border-t pt-2.5">
              <RowAction
                row={o}
                busy={movingNumber === o.number}
                disabled={pending}
                onAdvance={advance}
              />
              <Link
                href={`/admin/orders/${o.number}/slip`}
                target="_blank"
                aria-label={`Packing slip for ${o.number}`}
                className="ml-auto grid size-9 shrink-0 place-items-center rounded-btn text-ink-3 tap hit-touch hover:bg-surface-2 hover:text-ink"
              >
                <Printer aria-hidden className="size-4" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The one thing to do to this order next.
 *
 * Fulfilment is a queue, and a queue where every item must be opened, acted on
 * and backed out of costs three navigations per parcel. The expected move sits
 * in the row; anything unusual — cancelling, editing, adding a courier — still
 * lives on the detail page, which is where the context for those decisions is.
 */
function RowAction({
  row,
  busy,
  disabled,
  onAdvance,
}: {
  row: OrderRow;
  busy: boolean;
  disabled: boolean;
  onAdvance: (row: OrderRow, to: OrderStatus, label: string) => void;
}) {
  const step = NEXT_STEP[row.status];

  // PACKED has no one-click step: it needs a courier and a tracking number.
  if (!step) {
    if (row.status === "PACKED") {
      return (
        <Link
          href={`/admin/orders/${row.number}`}
          className={adminButton("secondary", "sm", "whitespace-nowrap")}
        >
          <Truck aria-hidden className="size-3.5" />
          Add courier
        </Link>
      );
    }
    return <span className="pr-1 text-2xs text-ink-4">—</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onAdvance(row, step.to, step.label)}
      disabled={busy || disabled}
      className={adminButton("primary", "sm", "whitespace-nowrap")}
    >
      {busy ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <Check aria-hidden className="size-3.5" />
      )}
      {step.label}
    </button>
  );
}
