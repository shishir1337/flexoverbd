"use client";

import { Check, Package, Search, Truck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { useContactInfo } from "@/components/settings-provider";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  formatOrderDate,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  type Order,
} from "@/lib/orders";
import { cn, formatBDT } from "@/lib/utils";
import { trackOrder } from "@/server/services/track-order";

/**
 * Guest order tracking.
 *
 * Deliberately reachable without an account: most orders here are placed as a
 * guest paying cash, so "where is my parcel" has to be answerable with just
 * the order number or the phone used to place it. Locking that behind a login
 * would push every one of those questions onto WhatsApp.
 */
export function OrderTracker({ initialQuery }: { initialQuery: string }) {
  const contact = useContactInfo();
  const inputId = useId();
  const phoneId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Order[] | null>(null);
  const [redacted, setRedacted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An order number alone is not proof of ownership — see `track-order.ts`.
  // The field appears the moment the query looks like one, rather than after a
  // failed search, so nobody has to submit twice to find out.
  const looksLikeOrderNumber = /^FB-/i.test(query.trim());

  const lookup = useCallback(async (value: string, mobile: string) => {
    setPending(true);
    setError(null);
    const result = await trackOrder(value, mobile || undefined);
    setPending(false);
    if (result.ok) {
      setResults(result.orders);
      setRedacted(result.redacted);
    } else {
      setError(result.error);
    }
  }, []);

  // A prefilled query (arriving from the confirmation page) searches at once,
  // but only when it can succeed on its own — an order number now needs the
  // mobile number too, so that case waits for the customer.
  useEffect(() => {
    if (initialQuery && !/^FB-/i.test(initialQuery)) {
      void lookup(initialQuery, "");
    }
  }, [initialQuery, lookup]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(query, phone);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-card border border-line bg-surface p-4 sm:p-5"
      >
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          Order number or mobile number
        </label>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <input
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FB-260804-1234 or 01712345678"
            autoComplete="off"
            // `w-full sm:flex-1`: while the row is flex-col the main axis is
            // vertical, so a bare flex-1 would set a height basis of 0 and
            // collapse h-12 to ~21px on a phone.
            className="h-12 w-full min-w-0 rounded-btn border border-line bg-surface px-3 text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none sm:flex-1"
          />
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="shrink-0"
          >
            <Search aria-hidden className="size-4.5" />
            {pending ? "Searching…" : "Track"}
          </Button>
        </div>
        {looksLikeOrderNumber && (
          <div className="mt-2.5">
            <label htmlFor={phoneId} className="text-sm font-semibold text-ink">
              Mobile number on the order
            </label>
            <input
              id={phoneId}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01712345678"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className="mt-2 h-12 w-full min-w-0 rounded-btn border border-line bg-surface px-3 text-ink tnum placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-3">
          Your order number was shown on the confirmation screen and starts with
          FB-. Searching by mobile number alone hides the delivery address.
        </p>
      </form>

      {redacted && (
        <p className="mt-4 rounded-card border border-line bg-surface-2 px-3.5 py-3 text-ink-2 text-sm">
          The delivery address is hidden because anyone can type a mobile
          number. Add your order number above to see the full details.
        </p>
      )}

      {results !== null && results.length === 0 && (
        <div className="mt-4 rounded-card border border-line bg-surface-2 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface">
            <Package aria-hidden className="size-6 text-ink-4" />
          </span>
          <p className="mt-3 text-base font-bold text-ink">No order found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
            Check the order number, or try the mobile number you ordered with.
            Still stuck? Message us and we&apos;ll look it up.
          </p>
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-btn border border-[#25D366] bg-surface px-4 text-sm font-bold text-[#128C4A] tap hover:bg-[#25D366]/10"
          >
            <WhatsAppIcon className="size-4 text-[#25D366]" />
            Ask on WhatsApp
          </a>
        </div>
      )}

      {results?.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

export function OrderCard({ order }: { order: Order }) {
  const contact = useContactInfo();
  // Real status from the database — this used to be derived from how long ago
  // the order was placed, which advanced a stage every 12 hours whether or not
  // anything had happened.
  const reached = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-ink tnum">{order.id}</p>
          <p className="text-xs text-ink-3">
            Placed {formatOrderDate(order.createdAt)} · {order.items.length}{" "}
            {order.items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <span className="rounded-chip bg-brand-soft px-3 py-1 text-xs font-bold text-brand-on">
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Horizontal on desktop, vertical on mobile — a five-step horizontal
          tracker is unreadable at 360px. */}
      <ol className="mt-5 flex flex-col gap-0 sm:flex-row sm:gap-2">
        {ORDER_STATUS_FLOW.map((step, i) => {
          const done = i <= reached;
          return (
            <li key={step} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
              <div className="flex flex-col items-center sm:w-full sm:flex-row">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    done ? "bg-success text-white" : "bg-surface-3 text-ink-4",
                  )}
                >
                  {done ? (
                    <Check aria-hidden className="size-4" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                {i < ORDER_STATUS_FLOW.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "w-0.5 flex-1 sm:h-0.5 sm:w-full",
                      i < reached ? "bg-success" : "bg-surface-3",
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "pb-4 text-xs sm:pb-0",
                  done ? "font-semibold text-ink" : "text-ink-3",
                )}
              >
                {ORDER_STATUS_LABEL[step]}
              </p>
            </li>
          );
        })}
      </ol>

      {/* Only once it is actually moving. "Where is my parcel" is the single
          most common support call, and the courier's own reference is the only
          answer that lets someone check for themselves. */}
      {order.courier && (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-btn bg-brand-soft px-3 py-2.5 text-[13px]">
          <Truck aria-hidden className="size-4 shrink-0 text-brand-600" />
          <span className="font-semibold text-ink">
            On its way with {order.courier}
          </span>
          {order.trackingNumber && (
            <span className="text-ink-2">
              · tracking{" "}
              <span className="font-mono font-semibold text-ink">
                {order.trackingNumber}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-2">
        <div>
          <p className="font-semibold text-ink">Delivering to</p>
          <p className="text-ink-2">{order.customer.name}</p>
          <p className="text-ink-2">
            {order.address.area}, {order.address.district}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold text-ink">Amount payable</p>
          <p data-price className="text-lg font-extrabold text-ink">
            {formatBDT(order.total)}
          </p>
          <p className="flex items-center gap-1 text-xs text-ink-3 sm:justify-end">
            <Truck aria-hidden className="size-3.5" />
            Cash on delivery
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded bg-surface-3 text-xs font-bold text-ink-2 tnum">
              {item.qty}
            </span>
            <span className="min-w-0 flex-1">
              <Link
                href={`/product/${item.slug ?? ""}`}
                className="block text-sm text-ink-2 clamp-1 hover:text-brand-on"
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

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`${contact.whatsappUrl.split("?")[0]}?text=${encodeURIComponent(
            `Hi FlexOver BD, about my order ${order.id}:`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles("secondary", "sm")}
        >
          <WhatsAppIcon className="size-4 text-[#25D366]" />
          Ask about this order
        </a>
      </div>
    </div>
  );
}
