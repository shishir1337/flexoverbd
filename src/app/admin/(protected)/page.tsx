import {
  ArrowRight,
  CheckCircle2,
  Package,
  PackageX,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Chip, PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import { STATUS_LABEL } from "@/lib/order-status";
import { cn, formatBDT } from "@/lib/utils";
import { getDashboard } from "@/server/services/admin/dashboard";

export const instant = false;
export const metadata: Metadata = { title: "Dashboard" };

const TONES = {
  urgent: "border-danger/30 bg-danger-soft",
  warn: "border-warn/30 bg-warn-soft",
  neutral: "border-line bg-surface",
} as const;

const TONE_TEXT = {
  urgent: "text-danger",
  warn: "text-warn",
  neutral: "text-ink",
} as const;

const STATUS_TONE: Record<
  string,
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
 * Dashboard.
 *
 * A work queue, not a report. What this replaced — four totals and a dashed box
 * saying the admin was still being built — answered none of the questions staff
 * actually open it with: what needs doing right now, and how much cash is
 * unaccounted for.
 *
 * Uncached: these are operational numbers someone is about to act on, and a
 * stale "3 awaiting confirmation" means three duplicate phone calls.
 */
export default async function AdminDashboard() {
  await connection();
  const session = await requireAdmin();

  const data = await getDashboard();
  const firstName = session.user.name.split(" ")[0];
  const orderDelta = data.ordersToday - data.ordersYesterday;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={
          data.work.length === 0
            ? "Nothing is waiting on you. Everything below is for reference."
            : "Here is what needs you right now."
        }
        actions={
          <Link href="/admin/orders" className={adminButton("primary", "md")}>
            <Package aria-hidden className="size-4" />
            Order queue
          </Link>
        }
      />

      {/* ---------------------------------------------------------- Queue */}
      {data.work.length === 0 ? (
        <div className="flex items-center gap-3 rounded-card border border-success/25 bg-success-soft p-4">
          <CheckCircle2 aria-hidden className="size-6 shrink-0 text-success" />
          <div>
            <p className="font-bold text-ink text-sm">All caught up</p>
            <p className="text-ink-2 text-sm">
              No orders waiting, nothing out of stock, nothing to moderate.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {data.work.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col rounded-card border p-3.5 tap transition-shadow hover:shadow-card-hover",
                  TONES[item.tone],
                )}
              >
                <span
                  className={cn(
                    "font-extrabold text-3xl tnum",
                    TONE_TEXT[item.tone],
                  )}
                >
                  {item.count}
                </span>
                <span className="mt-0.5 font-semibold text-ink text-sm">
                  {item.label}
                </span>
                <span className="mt-auto pt-1 text-2xs text-ink-3">
                  {item.hint}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ---------------------------------------------------------- Money */}
      <section className="mt-6">
        <h2 className="font-extrabold text-ink text-sm">Cash</h2>
        <p className="mt-0.5 text-ink-3 text-sm">
          Only delivered orders count as collected — on cash on delivery,
          anything else is money still in transit.
        </p>

        <dl className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Wallet}
            label="Collected today"
            value={formatBDT(data.collectedToday)}
            hint="Delivered today"
          />
          <Stat
            icon={TrendingUp}
            label="Collected this week"
            value={formatBDT(data.collected7d)}
            hint="Last 7 days"
          />
          <Stat
            icon={Truck}
            label="Awaiting collection"
            value={formatBDT(data.awaitingCollection)}
            hint="Confirmed, packed or with the courier"
            tone={data.awaitingCollection > 0 ? "warn" : undefined}
          />
          <Stat
            icon={orderDelta >= 0 ? TrendingUp : TrendingDown}
            label="Orders today"
            value={String(data.ordersToday)}
            hint={
              data.ordersYesterday === 0
                ? "None yesterday"
                : `${orderDelta >= 0 ? "+" : ""}${orderDelta} vs yesterday`
            }
          />
        </dl>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* ------------------------------------------------ Recent orders */}
        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold text-ink text-sm">Latest orders</h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 font-semibold text-brand-on text-sm tap hover:underline"
            >
              All orders
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <p className="mt-2 rounded-card border border-line border-dashed bg-surface p-6 text-center text-ink-3 text-sm">
              No orders yet.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-surface">
              {data.recentOrders.map((order) => (
                <li key={order.number}>
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className="flex items-center gap-3 p-3 tap hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink text-sm">
                        {order.customerName}
                      </span>
                      <span className="block truncate font-mono text-2xs text-ink-3">
                        {order.number} · {order.placedAt.slice(0, 10)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-ink text-sm tnum">
                        {formatBDT(order.total)}
                      </span>
                      <Chip tone={STATUS_TONE[order.status] ?? "neutral"}>
                        {STATUS_LABEL[order.status as OrderStatus] ??
                          order.status}
                      </Chip>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --------------------------------------------------- Low stock */}
        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold text-ink text-sm">Running out</h2>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 font-semibold text-brand-on text-sm tap hover:underline"
            >
              All products
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          {data.lowStock.length === 0 ? (
            <p className="mt-2 rounded-card border border-line border-dashed bg-surface p-6 text-center text-ink-3 text-sm">
              Everything is comfortably in stock.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-surface">
              {data.lowStock.map((row) => (
                <li key={row.variantId}>
                  <Link
                    href={`/admin/products/${row.productId}`}
                    className="flex items-center gap-3 p-3 tap hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full",
                        row.stock === 0
                          ? "bg-danger-soft text-danger"
                          : "bg-warn-soft text-warn",
                      )}
                    >
                      <PackageX aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink text-sm">
                        {row.title}
                      </span>
                      <span className="block truncate text-2xs text-ink-3">
                        {row.variantLabel}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-bold text-sm tnum",
                        row.stock === 0 ? "text-danger" : "text-warn",
                      )}
                    >
                      {row.stock === 0 ? "Out" : `${row.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- Totals */}
      <dl className="mt-6 grid grid-cols-2 gap-2.5">
        <Stat
          icon={Users}
          label="Customers"
          value={String(data.customerCount)}
          hint="By mobile number, guests included"
          href="/admin/customers"
        />
        <Stat
          icon={Package}
          label="Live products"
          value={String(data.productCount)}
          hint="Not archived"
          href="/admin/products"
        />
      </dl>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  href,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint: string;
  tone?: "warn";
  href?: string;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-1.5 font-semibold text-ink-3 text-2xs uppercase tracking-wide">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </dt>
      <dd>
        <span
          className={cn(
            "mt-1.5 block font-extrabold text-2xl tnum",
            tone === "warn" ? "text-warn" : "text-ink",
          )}
        >
          {value}
        </span>
        <span className="mt-0.5 block text-2xs text-ink-3">{hint}</span>
      </dd>
    </>
  );

  const className = cn(
    "rounded-card border border-line bg-surface p-3.5",
    href && "tap transition-shadow hover:shadow-card-hover",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
