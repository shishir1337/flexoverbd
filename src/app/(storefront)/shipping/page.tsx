import type { Metadata } from "next";
import { Bullets, ProsePage, Section } from "@/components/content/prose-page";
import { formatBDT } from "@/lib/utils";
import {
  getCommerceSettings,
  getContactSettings,
  getZonePair,
} from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description:
    "Delivery charges, timelines and coverage for FlexOver BD orders across all 64 districts of Bangladesh.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const [commerce, contact, zones] = await Promise.all([
    getCommerceSettings(),
    getContactSettings(),
    getZonePair(),
  ]);

  return (
    <ProsePage
      title="Shipping & delivery"
      intro="Where we deliver, how long it takes and what it costs."
      updated="August 2026"
    >
      <Section title="Delivery charges">
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-ink">Area</th>
                <th className="px-4 py-2.5 font-semibold text-ink">Charge</th>
                <th className="px-4 py-2.5 font-semibold text-ink">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="px-4 py-2.5">Inside Dhaka</td>
                <td className="px-4 py-2.5 font-semibold text-ink tnum">
                  {formatBDT(zones.inside.fee)}
                </td>
                <td className="px-4 py-2.5">{zones.inside.etaLabel}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">Outside Dhaka</td>
                <td className="px-4 py-2.5 font-semibold text-ink tnum">
                  {formatBDT(zones.outside.fee)}
                </td>
                <td className="px-4 py-2.5">{zones.outside.etaLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Delivery is <strong>free</strong> on every order over{" "}
          {formatBDT(commerce.freeShippingThreshold)}, anywhere in Bangladesh.
        </p>
      </Section>

      <Section title="Where we deliver">
        <p>
          All 64 districts. Orders inside Dhaka city are usually handed over
          within {zones.inside.etaLabel}; everywhere else takes{" "}
          {zones.outside.etaLabel} depending on the courier route.
        </p>
        <p>
          Remote upazilas may add a day. If your area is hard to reach, our team
          will call you before dispatch.
        </p>
      </Section>

      <Section title="How your order travels">
        <Bullets
          items={[
            <>
              <strong>Order placed</strong> — you get an order number starting
              FB-.
            </>,
            <>
              <strong>Confirmed</strong> — we call{" "}
              {contact.phoneDisplay ? "you" : "you"} to confirm the address and
              items.
            </>,
            <>
              <strong>Packed</strong> — checked and sealed at our warehouse.
            </>,
            <>
              <strong>Out for delivery</strong> — the rider calls before
              arriving.
            </>,
            <>
              <strong>Delivered</strong> — you check the parcel, then pay in
              cash.
            </>,
          ]}
        />
      </Section>

      <Section title="Checking before you pay">
        <p>
          You may open the parcel and check the product before paying the rider.
          If it is the wrong item or damaged, refuse the delivery and it comes
          straight back to us at no cost to you.
        </p>
      </Section>

      <Section title="Missed deliveries">
        <p>
          Riders attempt delivery up to three times and will always call first.
          If we cannot reach you on the number given, the parcel returns to us
          and we will contact you to rearrange.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Call {contact.phoneDisplay} or message us on WhatsApp with your order
          number and we will tell you exactly where your parcel is.
        </p>
      </Section>
    </ProsePage>
  );
}
