"use client";

import {
  Heart,
  Info,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { useWishlist } from "@/components/wishlist/wishlist-context";
import type { Order } from "@/lib/orders";
import { OrderCard } from "./order-tracker";

/**
 * Account overview.
 *
 * Everything shown here is reconstructed from orders already placed on this
 * device — there is no sign-in yet, so the page is honest about that rather
 * than pretending to be a logged-in session. The saved address is simply the
 * most recent delivery address, which is what a returning customer wants
 * anyway.
 */
export function AccountView({
  orders,
  signedIn,
  hasPhone,
  name,
  email,
  phone,
}: {
  orders: Order[];
  signedIn: boolean;
  /** Signed in but with no phone on file — we cannot match their orders. */
  hasPhone: boolean;
  /** From the account itself, when signed in. */
  name?: string;
  email?: string;
  phone?: string | null;
}) {
  const { ids: wishlistIds, hydrated: wishlistReady } = useWishlist();
  const latest = orders[0];

  return (
    <div className="space-y-6">
      {!signedIn ? (
        <div className="flex items-start gap-3 rounded-card border border-info/25 bg-info/5 p-4">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">
              You&apos;re not signed in.
            </span>{" "}
            You can still{" "}
            <Link href="/track-order" className="font-semibold text-brand-on">
              track any order
            </Link>{" "}
            with its number or the mobile you ordered with — no account needed.
          </p>
        </div>
      ) : !hasPhone ? (
        <div className="flex items-start gap-3 rounded-card border border-info/25 bg-info/5 p-4">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">
              Add your mobile number
            </span>{" "}
            to see your orders here. Orders are matched by the number you place
            them with — until then,{" "}
            <Link href="/track-order" className="font-semibold text-brand-on">
              track an order
            </Link>{" "}
            directly.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Package}
          value={String(orders.length)}
          label={orders.length === 1 ? "Order placed" : "Orders placed"}
          href="#orders"
        />
        <StatCard
          icon={Heart}
          value={wishlistReady ? String(wishlistIds.length) : "—"}
          label="Saved items"
          href="/wishlist"
        />
        <StatCard
          icon={MapPin}
          value={latest ? "1" : "0"}
          label="Saved address"
          href="#address"
        />
      </div>

      {latest && (
        <section
          id="address"
          aria-labelledby="address-heading"
          className="scroll-mt-24 rounded-card border border-line bg-surface p-4 sm:p-5"
        >
          <h2
            id="address-heading"
            className="flex items-center gap-2 text-base font-extrabold text-ink"
          >
            <User aria-hidden className="size-4 text-brand-600" />
            Your details
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-3">Name</dt>
              {/* The account's own name wins over the last order's snapshot:
                  an order is a record of what was true when it was placed, and
                  someone who has since corrected their name should see the
                  correction here rather than the old spelling. */}
              <dd className="font-medium text-ink">
                {name ?? latest.customer.name}
              </dd>
            </div>
            {email && (
              <div>
                <dt className="text-xs text-ink-3">Email</dt>
                <dd className="truncate font-medium text-ink">{email}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-ink-3">Mobile</dt>
              <dd className="flex items-center gap-1.5 font-medium text-ink tnum">
                <Phone aria-hidden className="size-3.5 text-brand-600" />
                {phone ?? latest.customer.phone}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-3">Delivery address</dt>
              <dd className="font-medium text-ink">
                {latest.address.street}, {latest.address.area},{" "}
                {latest.address.district}
                {latest.address.landmark && (
                  <span className="block text-ink-3">
                    Near {latest.address.landmark}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-3">
            Taken from your most recent order. Checkout will ask again so you
            can change it.
          </p>
        </section>
      )}

      <section
        id="orders"
        aria-labelledby="orders-heading"
        className="scroll-mt-24"
      >
        <h2
          id="orders-heading"
          className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink"
        >
          <Package aria-hidden className="size-4 text-brand-600" />
          Your orders
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center rounded-card border border-line bg-surface-2 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-surface">
              <ShoppingBag aria-hidden className="size-6 text-ink-4" />
            </span>
            <p className="mt-3 text-base font-bold text-ink">No orders yet</p>
            <p className="mt-1 max-w-sm text-sm text-ink-2">
              When you place an order it will appear here, with live tracking.
            </p>
            <Link
              href="/categories"
              className={buttonStyles("primary", "md", "mt-5")}
            >
              Start shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  href,
}: {
  icon: typeof Package;
  value: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 tap transition-colors hover:border-brand-500"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
        <Icon aria-hidden className="size-5 text-brand-600" />
      </span>
      <span>
        <span className="block text-xl font-extrabold text-ink tnum">
          {value}
        </span>
        <span className="block text-xs text-ink-3">{label}</span>
      </span>
    </Link>
  );
}
