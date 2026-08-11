import {
  AlertTriangle,
  ArrowLeft,
  EyeOff,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { cn, formatBDT } from "@/lib/utils";
import {
  ALLOWED_TRANSITIONS,
  getAdminOrder,
  getCustomerHistory,
  STATUS_LABEL,
} from "@/server/services/admin/orders";
import { CopyButton } from "./copy-button";
import { EditAddress } from "./edit-address";
import { EditItemQty } from "./edit-items";
import { ShippingCard } from "./shipping-card";
import { StatusControls } from "./status-controls";

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

/**
 * A Bangladeshi mobile number in the form wa.me expects: country code, no
 * plus, no leading zero. `01712345678` becomes `8801712345678`.
 */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  return `880${digits.replace(/^0+/, "")}`;
}

export async function generateMetadata(
  props: PageProps<"/admin/orders/[number]">,
): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Order ${number}` };
}

function stamp(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOrderPage(
  props: PageProps<"/admin/orders/[number]">,
) {
  // Explicitly request-time: these read live operational data that must never
  // be served from a prerendered shell.
  await connection();

  await requirePermission({ order: ["read"] });

  const { number } = await props.params;
  const order = await getAdminOrder(number);
  if (!order) notFound();

  const history = await getCustomerHistory(order.customerPhone, order.id);

  // Editable only while the parcel is still with us; the server enforces the
  // same rule, this just decides whether to offer the controls.
  const editable = ["PLACED", "CONFIRMED", "PACKED"].includes(order.status);

  /**
   * Lines whose variant has gone negative since the order was placed.
   *
   * Stock is decremented at checkout, so a healthy reserved line sits at zero
   * or above. Below zero means the same units were promised twice — usually a
   * manual adjustment or a correction — and whoever picks this will come up
   * short. Only worth saying while the parcel is still ours to fix.
   */
  const shortLines = editable
    ? order.items.filter((i) => i.variant && i.variant.stock < 0)
    : [];
  const districts = editable
    ? await prisma.district.findMany({
        where: { isActive: true },
        select: { id: true, name: true, division: { select: { name: true } } },
        orderBy: [{ division: { name: "asc" } }, { name: "asc" }],
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/orders"
        className="inline-flex min-h-9 items-center gap-1.5 text-ink-3 text-sm tap hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All orders
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-2xl text-ink tnum">
              {order.number}
            </h1>
            {/* The number goes into the courier's system by hand every time. */}
            <CopyButton value={order.number} label="the order number" />
          </div>
          <p className="mt-0.5 text-ink-3 text-sm">
            Placed {stamp(order.placedAt)} · {order.paymentMethod} ·{" "}
            {order.paymentStatus.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.number}/slip`}
            target="_blank"
            className={adminButton("secondary")}
          >
            <Printer aria-hidden className="size-4" />
            Slip
          </Link>
          <span className="rounded-chip bg-brand-soft px-3 py-1.5 font-bold text-brand-on text-sm">
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {shortLines.length > 0 && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-card border border-warn bg-warn-soft px-3.5 py-3 text-ink-2 text-sm"
        >
          <AlertTriangle
            aria-hidden
            className="mt-0.5 size-4.5 shrink-0 text-warn"
          />
          <span>
            <strong className="font-semibold text-ink">
              Stock will not cover this order.
            </strong>{" "}
            {shortLines.map((i) => i.titleSnapshot).join(", ")}{" "}
            {shortLines.length === 1 ? "is" : "are"} oversold. Restock before
            packing, or reduce the quantity here.
          </span>
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-4">
          {/* Items */}
          <div className="rounded-card border border-line bg-surface">
            <h2 className="border-line border-b px-4 py-3 font-extrabold text-ink text-sm">
              Items ({order.items.length})
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-3">
                  <EditItemQty
                    number={order.number}
                    itemId={item.id}
                    title={item.titleSnapshot}
                    qty={item.qty}
                    editable={editable}
                    isOnlyItem={order.items.length === 1}
                  />
                  <div className="min-w-0 flex-1">
                    {item.product ? (
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="font-medium text-ink text-sm hover:text-brand-on"
                      >
                        {item.titleSnapshot}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink text-sm">
                        {item.titleSnapshot}
                      </span>
                    )}
                    <p className="text-2xs text-ink-3">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}
                      {item.skuSnapshot}
                    </p>
                    {editable && item.variant && item.variant.stock < 0 && (
                      <p className="mt-0.5 flex items-center gap-1 font-semibold text-2xs text-warn">
                        <AlertTriangle aria-hidden className="size-3" />
                        Oversold by {Math.abs(item.variant.stock)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-right font-bold text-ink text-sm tnum">
                    {formatBDT(item.lineTotal)}
                    <span className="block font-normal text-2xs text-ink-3">
                      {formatBDT(item.priceSnapshot)} each
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-line border-t px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="text-ink tnum">{formatBDT(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Delivery</dt>
                <dd className="text-ink tnum">
                  {order.deliveryFee === 0
                    ? "Free"
                    : formatBDT(order.deliveryFee)}
                </dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-2">
                    Discount {order.coupon ? `(${order.coupon.code})` : ""}
                  </dt>
                  <dd className="text-success tnum">
                    −{formatBDT(order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-line border-t pt-1.5 font-extrabold">
                <dt className="text-ink">Total payable</dt>
                <dd className="text-ink tnum">{formatBDT(order.total)}</dd>
              </div>
            </dl>
          </div>

          {/* Timeline */}
          <div className="rounded-card border border-line bg-surface">
            <h2 className="border-line border-b px-4 py-3 font-extrabold text-ink text-sm">
              History
            </h2>
            <ol className="divide-y divide-line">
              {order.events.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink text-sm">
                      {STATUS_LABEL[e.status]}
                    </span>
                    {!e.isCustomerVisible && (
                      <span className="inline-flex items-center gap-1 rounded-chip bg-surface-3 px-2 py-0.5 font-semibold text-2xs text-ink-3">
                        <EyeOff aria-hidden className="size-3" />
                        Internal
                      </span>
                    )}
                    <span className="ml-auto text-2xs text-ink-3">
                      {stamp(e.createdAt)}
                    </span>
                  </div>
                  {e.note && (
                    <p className="mt-1 text-ink-2 text-sm">{e.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <StatusControls
            number={order.number}
            current={order.status}
            allowed={ALLOWED_TRANSITIONS[order.status]}
            courier={order.courier ?? ""}
            trackingNumber={order.trackingNumber ?? ""}
          />

          {/* Only once it is with a courier. Before that there is nothing to
              show and an empty card is just noise in the sidebar. */}
          {(order.status === "SHIPPED" ||
            order.status === "DELIVERED" ||
            order.courier) && (
            <ShippingCard
              number={order.number}
              courier={order.courier ?? ""}
              trackingNumber={order.trackingNumber ?? ""}
            />
          )}

          <div className="rounded-card border border-line bg-surface p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold text-ink">Customer</h2>
              {history.totalOrders > 0 && (
                <Link
                  href={`/admin/customers/${encodeURIComponent(order.customerPhone)}`}
                  className="font-semibold text-brand-on text-2xs tap hover:underline"
                >
                  History
                </Link>
              )}
            </div>
            <p className="mt-2 font-medium text-ink">{order.customerName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={`tel:${order.customerPhone}`}
                className="flex min-h-9 items-center gap-1.5 font-medium text-brand-on tnum tap"
              >
                <Phone aria-hidden className="size-3.5" />
                {order.customerPhone}
              </a>
              {/* Confirming a COD order happens on WhatsApp as often as on a
                  call here. wa.me wants the number without a leading zero or
                  plus, so it is normalised to the country code. */}
              <a
                href={`https://wa.me/${waNumber(order.customerPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-9 items-center gap-1.5 font-semibold text-2xs text-ink-3 tap hover:text-ink"
              >
                <MessageCircle aria-hidden className="size-3.5" />
                WhatsApp
              </a>
              <CopyButton
                value={order.customerPhone}
                label="the phone number"
                className="-ml-1"
              />
            </div>
            {order.customerEmail && (
              <p className="text-ink-2">{order.customerEmail}</p>
            )}

            {/* Their record with us, before another parcel goes out. */}
            {history.totalOrders === 0 ? (
              <p className="mt-3 rounded-btn bg-surface-2 px-2.5 py-2 text-2xs text-ink-3">
                First order from this number.
              </p>
            ) : (
              <div
                className={cn(
                  "mt-3 rounded-btn px-2.5 py-2",
                  history.isRisky ? "bg-warn-soft" : "bg-surface-2",
                )}
              >
                <p className="flex items-start gap-1.5 text-2xs text-ink-2">
                  {history.isRisky && (
                    <AlertTriangle
                      aria-hidden
                      className="mt-px size-3.5 shrink-0 text-warn"
                    />
                  )}
                  <span>
                    <strong className="font-semibold text-ink">
                      {history.totalOrders} previous{" "}
                      {history.totalOrders === 1 ? "order" : "orders"}
                    </strong>{" "}
                    · {history.delivered} delivered
                    {history.cancelled > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-semibold text-danger">
                          {history.cancelled} refused
                        </span>
                      </>
                    )}
                    {history.lifetimeValue > 0 && (
                      <> · {formatBDT(history.lifetimeValue)} collected</>
                    )}
                    {history.isRisky && (
                      <span className="mt-1 block font-semibold text-warn">
                        Worth a confirmation call before dispatch.
                      </span>
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Its own card, not a subheading inside Customer.

              This is the block that gets read aloud down the phone and typed
              into a courier's form — the single most-used thing on the page.
              Buried under a customer's order history it was competing with
              lifetime-value figures for attention it should never have to
              share. */}
          <div className="rounded-card border border-line bg-surface p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-extrabold text-ink">
                <MapPin aria-hidden className="size-3.5" />
                Deliver to
              </h2>
              <EditAddress
                number={order.number}
                editable={editable}
                districts={districts.map((d) => ({
                  id: d.id,
                  name: d.name,
                  division: d.division.name,
                }))}
                initial={{
                  customerName: order.customerName,
                  customerPhone: order.customerPhone,
                  districtId: order.districtId,
                  area: order.area,
                  line1: order.line1,
                  landmark: order.landmark ?? "",
                  notes: order.notes ?? "",
                }}
              />
            </div>
            {/* One control for the whole label, in the order a courier form
                asks for it. Copying four fields one at a time is four chances
                to paste into the wrong box. */}
            <CopyButton
              value={[
                order.customerName,
                order.customerPhone,
                order.line1,
                `${order.area}, ${order.district.name}`,
                order.landmark ? `Near ${order.landmark}` : "",
              ]
                .filter(Boolean)
                .join("\n")}
              label="the full delivery address"
              className="-ml-1.5 mt-1"
            />
            <address className="mt-1 text-ink-2 not-italic">
              {order.line1}
              <br />
              {order.area}, {order.district.name}
              {order.landmark && (
                <>
                  <br />
                  <span className="text-ink-3">Near {order.landmark}</span>
                </>
              )}
            </address>
            <p className="mt-2 flex items-center gap-1.5 text-2xs text-ink-3">
              <Truck aria-hidden className="size-3.5" />
              {order.district.zone.name} · {order.district.zone.etaLabel}
            </p>

            {order.notes && (
              <>
                <h3 className="mt-4 font-extrabold text-ink">Customer note</h3>
                <p className="mt-1 text-ink-2">{order.notes}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
