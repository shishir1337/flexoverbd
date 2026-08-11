import type { Metadata } from "next";
import { Bullets, ProsePage, Section } from "@/components/content/prose-page";
import {
  getCommerceSettings,
  getContactSettings,
} from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "How to return a product to FlexOver BD, what qualifies, and how refunds are paid.",
  alternates: { canonical: "/refund-policy" },
};

export default async function RefundPolicyPage() {
  const [commerce, contact] = await Promise.all([
    getCommerceSettings(),
    getContactSettings(),
  ]);

  return (
    <ProsePage
      title="Return & refund policy"
      intro={`You have ${commerce.returnWindowDays} days from delivery to return most items.`}
      updated="August 2026"
    >
      <Section title="The short version">
        <Bullets
          items={[
            `You have ${commerce.returnWindowDays} days from the day you receive it.`,
            "The product must be unused and in its original packaging, with tags attached.",
            "If we sent the wrong or a damaged item, we pay the return cost.",
            "Refunds are paid by bKash, Nagad or bank transfer within 7 working days of the return reaching us.",
          ]}
        />
      </Section>

      <Section title="What can be returned">
        <p>
          Most products can be returned if they are unused, undamaged and still
          in their original packaging with all tags, manuals and free gifts
          included.
        </p>
      </Section>

      <Section title="What cannot be returned">
        <p>For hygiene and safety reasons we cannot accept returns of:</p>
        <Bullets
          items={[
            "Cosmetics, skincare, fragrance and personal care items once opened or the seal is broken.",
            "Innerwear and swimwear.",
            "Items damaged by misuse, or with missing packaging and accessories.",
            "Products bought as clearance or marked non-returnable on the product page.",
          ]}
        />
      </Section>

      <Section title="How to start a return">
        <Bullets
          items={[
            <>
              Message us on WhatsApp at {contact.phoneDisplay} with your order
              number and a photo of the item.
            </>,
            "We confirm the return and arrange a pickup, or ask you to send it to our address.",
            "Once it arrives and passes a quick check, we process your refund or replacement.",
          ]}
        />
      </Section>

      <Section title="Refunds">
        <p>
          Refunds go back to you by bKash, Nagad or bank transfer — whichever
          you prefer — within 7 working days of us receiving the return. The
          original delivery charge is refunded only when the fault was ours.
        </p>
      </Section>

      <Section title="Damaged or wrong items">
        <p>
          If a parcel arrives damaged, or is not what you ordered, tell us
          within 48 hours with photos. We will replace it or refund you in full,
          including delivery, and cover the cost of sending it back.
        </p>
      </Section>
    </ProsePage>
  );
}
