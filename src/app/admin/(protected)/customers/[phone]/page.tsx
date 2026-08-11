import { AlertTriangle, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/guards";
import { STATUS_LABEL } from "@/lib/order-status";
import { cn, formatBDT } from "@/lib/utils";
import { getCustomer } from "@/server/services/admin/customers";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/admin/customers/[phone]">,
): Promise<Metadata> {
  const { phone } = await props.params;
  const customer = await getCustomer(decodeURIComponent(phone));
  return { title: customer ? customer.name : "Customer" };
}

export default async function AdminCustomerPage(
  props: PageProps<"/admin/customers/[phone]">,
) {
  await connection();
  await requirePermission({ customer: ["read"] });

  const { phone } = await props.params;
  const customer = await getCustomer(decodeURIComponent(phone));
  if (!customer) notFound();

  // Worth flagging before someone dispatches another parcel: on COD, a refused
  // delivery costs the courier fee both ways and the item comes back unsellable
  // often enough to matter.
  const risky =
    customer.cancelledCount >= 2 &&
    customer.cancelledCount >= customer.deliveredCount;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={customer.name}
      />
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3 text-sm">
        <a
          href={`tel:${customer.phone}`}
          className="inline-flex items-center gap-1.5 tnum hover:text-ink"
        >
          <Phone aria-hidden className="size-3.5" />
          {customer.phone}
        </a>
        {customer.email && <span>{customer.email}</span>}
        {customer.hasAccount && (
          <span className="rounded-chip bg-brand-soft px-2 py-0.5 font-medium text-2xs text-brand-on">
            Has an account
          </span>
        )}
      </p>

      {risky && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-card border border-warn bg-warn-soft px-3.5 py-3 text-ink-2 text-sm"
        >
          <AlertTriangle
            aria-hidden
            className="mt-0.5 size-4.5 shrink-0 text-warn"
          />
          <span>
            {customer.cancelledCount} of {customer.orderCount} orders were
            cancelled or returned. Worth a confirmation call before dispatch.
          </span>
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Lifetime value"
          value={formatBDT(customer.lifetimeValue)}
        />
        <Stat label="Orders" value={String(customer.orderCount)} />
        <Stat label="Delivered" value={String(customer.deliveredCount)} />
        <Stat
          label="Cancelled"
          value={String(customer.cancelledCount)}
          tone={customer.cancelledCount > 0 ? "danger" : undefined}
        />
      </dl>

      {customer.addresses.length > 0 && (
        <section className="mt-5 rounded-card border border-line bg-surface p-4">
          <h2 className="font-extrabold text-ink text-sm">Addresses used</h2>
          <ul className="mt-2 space-y-1.5">
            {customer.addresses.map((a) => (
              <li key={a} className="flex items-start gap-2 text-ink-2 text-sm">
                <MapPin
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-ink-4"
                />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="font-extrabold text-ink">Orders</h2>
        <ul className="mt-2 space-y-2">
          {customer.orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.number}`}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 tap hover:border-brand-500"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink text-sm tnum">
                    {o.number}
                  </span>
                  <span className="block truncate text-2xs text-ink-3">
                    {o.placedAt.slice(0, 10)} · {o.itemCount}{" "}
                    {o.itemCount === 1 ? "item" : "items"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold text-ink text-sm tnum">
                    {formatBDT(o.total)}
                  </span>
                  <span className="block text-2xs text-ink-3">
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-extrabold text-lg tnum",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
