import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/utils";
import {
  getContactSettings,
  getSiteSettings,
} from "@/server/services/settings";
import { PrintTrigger } from "../[number]/slip/print-trigger";

export const instant = false;
export const metadata: Metadata = { title: "Packing slips" };

/**
 * Several packing slips in one print job.
 *
 * Staff pack in batches — twenty orders confirmed in the morning go out on one
 * courier run — and opening twenty tabs to print twenty slips was the slowest
 * part of that. Each slip is its own A5 page via `break-after`, so one Ctrl+P
 * produces the stack in order.
 *
 * Laid out for paper, not screen: black on white, no brand gradients, and the
 * amount to collect boxed and oversized because a rider reading the wrong
 * number is a real loss.
 */
export default async function BatchSlipsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requirePermission({ order: ["read"] });

  const sp = await props.searchParams;
  const numbers = (typeof sp.n === "string" ? sp.n.split(",") : [])
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 100);

  const [orders, site, contact] = await Promise.all([
    numbers.length
      ? prisma.order.findMany({
          where: { number: { in: numbers } },
          include: { district: true, items: { orderBy: { id: "asc" } } },
        })
      : Promise.resolve([]),
    getSiteSettings(),
    getContactSettings(),
  ]);

  // Kept in the order they were selected rather than whatever the database
  // returns, so the printed stack matches the on-screen list.
  const ordered = numbers
    .map((n) => orders.find((o) => o.number === n))
    .filter((o): o is (typeof orders)[number] => Boolean(o));

  if (ordered.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="font-bold text-ink">Nothing to print</p>
        <p className="mt-1 text-ink-3 text-sm">
          Select orders in the list, then choose Print slips.
        </p>
        <Link
          href="/admin/orders"
          className="mt-4 inline-flex font-semibold text-brand-on text-sm hover:underline"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white text-neutral-900">
      <div className="print:hidden">
        <p className="mb-2 text-ink-3 text-sm">
          {ordered.length} {ordered.length === 1 ? "slip" : "slips"} ready. Each
          prints on its own page.
        </p>
        <PrintTrigger />
      </div>

      {ordered.map((order) => (
        <article
          key={order.id}
          className="mx-auto mb-6 max-w-[148mm] border border-neutral-300 p-5 break-after-page last:mb-0 last:break-after-auto print:border-0 print:p-0"
        >
          <header className="flex items-start justify-between gap-4 border-neutral-300 border-b pb-3">
            <div>
              <p className="font-extrabold text-lg">{site.name}</p>
              <p className="text-neutral-600 text-xs">
                {contact.phoneDisplay} · {contact.email}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-extrabold text-base">
                {order.number}
              </p>
              <p className="text-neutral-600 text-xs">
                {order.placedAt.toISOString().slice(0, 10)}
              </p>
            </div>
          </header>

          <section className="mt-4">
            <p className="font-semibold text-neutral-500 text-xs uppercase tracking-wide">
              Deliver to
            </p>
            <p className="mt-1 font-extrabold text-base">
              {order.customerName}
            </p>
            <p className="font-mono text-sm">{order.customerPhone}</p>
            <p className="mt-1 text-sm leading-relaxed">
              {order.line1}
              {order.landmark && <>, near {order.landmark}</>}
              <br />
              {order.area}, {order.district.name}
            </p>
          </section>

          {order.notes && (
            <section className="mt-3 border border-neutral-300 border-dashed p-2">
              <p className="font-semibold text-neutral-500 text-xs uppercase">
                Customer note
              </p>
              <p className="text-sm">{order.notes}</p>
            </section>
          )}

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-neutral-300 border-y">
                <th className="py-1.5 text-left font-semibold">Item</th>
                <th className="w-10 py-1.5 text-right font-semibold">Qty</th>
                <th className="w-24 py-1.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-neutral-200 border-b">
                  <td className="py-1.5 pr-2">
                    {item.titleSnapshot}
                    {item.variantLabel && (
                      <span className="block text-neutral-600 text-xs">
                        {item.variantLabel}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{item.qty}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatBDT(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 border-2 border-neutral-900 p-3 text-center">
            <p className="font-semibold text-neutral-600 text-xs uppercase tracking-wide">
              {order.paymentMethod === "COD"
                ? "Collect from customer"
                : "Already paid"}
            </p>
            <p className="font-extrabold text-2xl tabular-nums">
              {order.paymentMethod === "COD" ? formatBDT(order.total) : "৳0"}
            </p>
          </div>

          {(order.courier || order.trackingNumber) && (
            <p className="mt-3 text-center text-neutral-600 text-xs">
              {[order.courier, order.trackingNumber]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <footer className="mt-4 border-neutral-300 border-t pt-2 text-center text-[10px] text-neutral-500">
            Check the parcel before paying. Returns accepted — call{" "}
            {contact.phoneDisplay}.
          </footer>
        </article>
      ))}
    </div>
  );
}
