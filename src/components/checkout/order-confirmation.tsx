import {
  Banknote,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonStyles } from "@/components/ui/button";
import { formatOrderDate, type Order } from "@/lib/orders";
import { formatBDT } from "@/lib/utils";
import { getContactSettings, getZonePair } from "@/server/services/settings";

/**
 * Confirmation screen.
 *
 * The order number is the single most important thing on this page — it is
 * what a customer quotes on WhatsApp when they ask where their parcel is — so
 * it gets the most visual weight, with the WhatsApp link prefilled with it.
 */
export async function OrderConfirmation({
  orderId,
  order,
}: {
  orderId: string;
  order: Order | null;
}) {
  const [contact, zones] = await Promise.all([
    getContactSettings(),
    getZonePair(),
  ]);

  if (!order) {
    return (
      <div className="container-page flex flex-col items-center py-16 text-center lg:py-24">
        <span className="grid size-16 place-items-center rounded-full bg-surface-2">
          <Package aria-hidden className="size-7 text-ink-4" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">
          We couldn&apos;t find that order
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          {orderId
            ? `We have no record of order ${orderId}. Check the number, or use the tracking page.`
            : "No order number was provided."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/track-order" className={buttonStyles("primary", "md")}>
            Track an order
          </Link>
          <Link href="/" className={buttonStyles("secondary", "md")}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const waText = encodeURIComponent(
    `Hi FlexOver BD, I have a question about my order ${order.id}.`,
  );

  return (
    <div className="container-page py-6 pb-14">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-card border border-success/30 bg-success-soft p-5 text-center sm:p-7">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success">
            <CheckCircle2
              aria-hidden
              className="size-8 text-white"
              strokeWidth={2}
            />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">
            Order placed — thank you, {order.customer.name.split(" ")[0]}!
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            We&apos;ll call {order.customer.phone} shortly to confirm.
          </p>

          <div className="mx-auto mt-5 inline-flex flex-col rounded-card bg-surface px-6 py-3 shadow-card">
            <span className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
              Order number
            </span>
            <span className="text-xl font-extrabold text-ink tnum sm:text-2xl">
              {order.id}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Placed {formatOrderDate(order.createdAt)} · Save this number
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoCard icon={MapPin} title="Delivering to">
            <p className="font-semibold text-ink">{order.customer.name}</p>
            <p>{order.address.street}</p>
            <p>
              {order.address.area}, {order.address.district}
            </p>
            {order.address.landmark && (
              <p className="text-ink-3">Near {order.address.landmark}</p>
            )}
          </InfoCard>

          <InfoCard icon={Truck} title="Expected delivery">
            <p className="font-semibold text-ink">
              {order.address.district === "Dhaka"
                ? zones.inside.etaLabel
                : zones.outside.etaLabel}
            </p>
            <p className="flex items-center gap-1.5 text-ink-2">
              <Banknote aria-hidden className="size-4 text-brand-600" />
              Pay {formatBDT(order.total)} in cash on delivery
            </p>
            <p className="text-ink-3">
              Check the product before you pay the rider.
            </p>
          </InfoCard>
        </div>

        <div className="mt-4 rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-ink">
            Order summary ({order.items.length}{" "}
            {order.items.length === 1 ? "item" : "items"})
          </h2>

          <ul className="mt-3 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded bg-surface-3 text-xs font-bold text-ink-2 tnum">
                  {item.qty}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.slug ?? ""}`}
                    className="block text-sm text-ink-2 clamp-2 hover:text-brand-on"
                  >
                    {item.title}
                  </Link>
                  {item.variantLabel && (
                    <span className="block text-xs text-ink-3">
                      {item.variantLabel}
                    </span>
                  )}
                </span>
                <span
                  data-price
                  className="shrink-0 text-sm font-semibold text-ink"
                >
                  {formatBDT(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal</dt>
              <dd data-price className="text-ink">
                {formatBDT(order.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Delivery</dt>
              <dd className="text-ink">
                {order.deliveryFee === 0 ? (
                  <span className="font-semibold text-success">Free</span>
                ) : (
                  <span data-price>{formatBDT(order.deliveryFee)}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
              <dt className="text-ink">Total payable</dt>
              <dd data-price className="text-ink">
                {formatBDT(order.total)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/track-order?q=${order.id}`}
            className={buttonStyles("primary", "lg", "flex-1")}
          >
            <Package aria-hidden className="size-4.5" />
            Track this order
          </Link>
          <Link
            href="/categories"
            className={buttonStyles("secondary", "lg", "flex-1")}
          >
            Continue shopping
          </Link>
        </div>

        <div className="mt-4 rounded-card border border-line bg-surface-2 p-4 text-center">
          <p className="text-sm font-semibold text-ink">Questions about it?</p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            <a
              href={`${contact.whatsappUrl.split("?")[0]}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-[#25D366] bg-surface px-4 text-sm font-bold text-[#128C4A] tap hover:bg-[#25D366]/10"
            >
              <WhatsAppIcon className="size-4 text-[#25D366]" />
              WhatsApp us
            </a>
            <a
              href={contact.phoneHref}
              className="inline-flex h-10 items-center gap-2 rounded-btn border border-line bg-surface px-4 text-sm font-bold text-ink tap hover:border-brand-500"
            >
              <Phone aria-hidden className="size-4 text-brand-600" />
              {contact.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Icon aria-hidden className="size-4 text-brand-600" />
        {title}
      </h2>
      <div className="mt-2 space-y-0.5 text-[13px] text-ink-2">{children}</div>
    </div>
  );
}
