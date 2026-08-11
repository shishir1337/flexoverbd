import { BadgeCheck, RotateCcw, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonStyles } from "@/components/ui/button";
import { compactCount, formatBDT } from "@/lib/utils";
import {
  getCommerceSettings,
  getSiteSettings,
  getStoreStats,
  getZonePair,
} from "@/server/services/settings";

/**
 * Generated, not a constant: the store name is admin-editable, and a static
 * metadata export would freeze whatever it was at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "About Us",
    description: `${site.shortDescription}. Who we are, what we sell and how we deliver across Bangladesh.`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const [storeStats, site, commerce, zones] = await Promise.all([
    getStoreStats(),
    getSiteSettings(),
    getCommerceSettings(),
    getZonePair(),
  ]);

  const PROMISES = [
    {
      icon: Wallet,
      title: "Cash on delivery",
      body: "Pay when the parcel is in your hand, after you have checked it. No advance payment, ever.",
    },
    {
      icon: Truck,
      title: "All 64 districts",
      body: `${zones.inside.etaLabel} inside Dhaka, ${zones.outside.etaLabel} everywhere else, with free delivery over ${formatBDT(commerce.freeShippingThreshold)}.`,
    },
    {
      icon: BadgeCheck,
      title: "Sourced directly",
      body: "Every parcel is checked and sealed before dispatch. If it is not authentic, it does not ship.",
    },
    {
      icon: RotateCcw,
      title: `${commerce.returnWindowDays}-day returns`,
      body: "Changed your mind, or it is not right? Send it back — no interrogation.",
    },
  ];

  // Built here rather than at module scope: the figures are admin-editable
  // settings now, so they cannot be constants.
  const STATS = [
    {
      value: `${compactCount(storeStats.ordersDelivered)}+`,
      label: "Orders delivered",
    },
    {
      value: `${compactCount(storeStats.happyCustomers)}+`,
      label: "Customers",
    },
    { value: String(storeStats.districtsCovered), label: "Districts" },
    { value: `${storeStats.ratingAverage}/5`, label: "Average rating" },
  ];

  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="text-xs font-bold tracking-wide text-brand-on uppercase">
            About us
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-4xl">
            {site.tagline}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">
            {site.name} is an online store for people across Bangladesh who want
            a straight deal: honest prices, real products, and a parcel that
            turns up when we said it would.
          </p>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-4 rounded-card border border-line bg-surface-2 p-5 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-xl font-extrabold text-brand-on tnum sm:text-2xl">
                  {stat.value}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-3 sm:text-xs">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink">What we promise</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-card border border-line bg-surface p-4"
              >
                <span className="grid size-10 place-items-center rounded-full bg-brand-soft">
                  <Icon aria-hidden className="size-5 text-brand-600" />
                </span>
                <h3 className="mt-3 text-base font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink">What we sell</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2 sm:text-[15px]">
            Eight departments — fashion, gadgets, home essentials, beauty and
            care, fragrances, lifestyle, sports and fitness, and watches and
            bags. We stock what people actually reorder, rather than filling the
            catalogue for its own sake.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/categories" className={buttonStyles("primary", "md")}>
              Browse all categories
            </Link>
            <Link href="/contact" className={buttonStyles("secondary", "md")}>
              Talk to us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
