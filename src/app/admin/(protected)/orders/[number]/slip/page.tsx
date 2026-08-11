import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { formatBDT } from "@/lib/utils";
import { getAdminOrder } from "@/server/services/admin/orders";
import {
  getContactSettings,
  getSiteSettings,
} from "@/server/services/settings";
import { PrintTrigger } from "./print-trigger";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/admin/orders/[number]/slip">,
): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Packing slip ${number}` };
}

/**
 * Packing slip.
 *
 * Printed and taped to the parcel, so it is laid out for A5 paper rather than
 * for a screen: black on white, no brand gradients, and the two things a rider
 * actually needs — the address and the amount to collect — set larger than
 * everything else.
 *
 * The cash amount is the critical field on a COD slip. A rider reading the
 * wrong number is a real loss for the shop, so it gets its own boxed row
 * instead of sitting at the end of a column of totals.
 */
export default async function PackingSlipPage(
  props: PageProps<"/admin/orders/[number]/slip">,
) {
  await connection();
  await requirePermission({ order: ["read"] });

  const { number } = await props.params;
  const [order, site, contact] = await Promise.all([
    getAdminOrder(number),
    getSiteSettings(),
    getContactSettings(),
  ]);
  if (!order) notFound();

  const placed = order.placedAt.toISOString().slice(0, 10);

  return (
    // Forced to a light palette regardless of the admin theme: this is ink on
    // paper, and a dark background would empty a printer cartridge.
    <div className="mx-auto max-w-[148mm] bg-white text-neutral-900 print:max-w-none">
      <PrintTrigger />

      <article className="border border-neutral-300 p-5 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-neutral-300 border-b pb-3">
          <div>
            <p className="font-extrabold text-lg">{site.name}</p>
            <p className="text-neutral-600 text-xs">
              {contact.phoneDisplay} · {contact.email}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono font-extrabold text-base">{order.number}</p>
            <p className="text-neutral-600 text-xs">{placed}</p>
          </div>
        </header>

        <section className="mt-4">
          <p className="font-semibold text-neutral-500 text-xs uppercase tracking-wide">
            Deliver to
          </p>
          <p className="mt-1 font-extrabold text-base">{order.customerName}</p>
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
                  {item.skuSnapshot && (
                    <span className="block font-mono text-neutral-500 text-[10px]">
                      {item.skuSnapshot}
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

        <dl className="mt-3 ml-auto w-full max-w-[60%] space-y-1 text-sm">
          <Row label="Subtotal" value={formatBDT(order.subtotal)} />
          <Row
            label="Delivery"
            value={
              order.deliveryFee === 0 ? "Free" : formatBDT(order.deliveryFee)
            }
          />
          {order.discount > 0 && (
            <Row
              label={`Discount${order.coupon ? ` (${order.coupon.code})` : ""}`}
              value={`−${formatBDT(order.discount)}`}
            />
          )}
        </dl>

        <div className="mt-3 border-2 border-neutral-900 p-3 text-center">
          <p className="font-semibold text-neutral-600 text-xs uppercase tracking-wide">
            {order.paymentMethod === "COD"
              ? "Collect from customer"
              : "Already paid"}
          </p>
          <p className="font-extrabold text-2xl tabular-nums">
            {order.paymentMethod === "COD" ? formatBDT(order.total) : "৳0"}
          </p>
          {order.paymentMethod === "COD" && (
            <p className="text-neutral-600 text-xs">
              Cash on delivery · total {formatBDT(order.total)}
            </p>
          )}
        </div>

        {(order.courier || order.trackingNumber) && (
          <p className="mt-3 text-center text-neutral-600 text-xs">
            {[order.courier, order.trackingNumber].filter(Boolean).join(" · ")}
          </p>
        )}

        <footer className="mt-4 border-neutral-300 border-t pt-2 text-center text-[10px] text-neutral-500">
          Check the parcel before paying. Returns accepted — call{" "}
          {contact.phoneDisplay}.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-600">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
