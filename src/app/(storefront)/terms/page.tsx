import type { Metadata } from "next";
import { Bullets, ProsePage, Section } from "@/components/content/prose-page";
import {
  getCommerceSettings,
  getContactSettings,
  getSiteSettings,
} from "@/server/services/settings";

/**
 * Generated, not a constant: the store name is admin-editable, and a static
 * metadata export would freeze whatever it was at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Terms & Conditions",
    description: `The terms that apply when you buy from ${site.name}.`,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const [commerce, contact, site] = await Promise.all([
    getCommerceSettings(),
    getContactSettings(),
    getSiteSettings(),
  ]);

  return (
    <ProsePage
      title="Terms & conditions"
      intro={`These terms apply whenever you order from ${site.name}.`}
      updated="August 2026"
    >
      <Section title="Placing an order">
        <p>
          Adding items to your cart and submitting the checkout form is an offer
          to buy. The order is confirmed once our team calls or messages you.
          Until then we may decline it — for example if an item has just sold
          out.
        </p>
      </Section>

      <Section title="Prices and availability">
        <p>
          All prices are in Bangladeshi Taka and include VAT where applicable.
          Stock and prices can change without notice. If a price is listed
          incorrectly we will contact you before dispatching, and you may cancel
          without charge.
        </p>
      </Section>

      <Section title="Payment">
        <p>
          We currently accept cash on delivery only. You pay the rider when the
          parcel reaches you, after checking the product. Online payment options
          will be added later.
        </p>
      </Section>

      <Section title="Delivery">
        <p>
          Delivery timelines are estimates, not guarantees — courier delays,
          weather and hartals can affect them. Charges and timings are set out
          on our shipping page.
        </p>
      </Section>

      <Section title="Returns">
        <p>
          You may return most items within {commerce.returnWindowDays} days of
          delivery under the conditions in our return and refund policy.
        </p>
      </Section>

      <Section title="Product information">
        <p>
          We describe products as accurately as we can. Colours may look
          slightly different on your screen, and minor variations between
          production batches are normal. If something is materially different
          from its description, it qualifies for a return.
        </p>
      </Section>

      <Section title="Acceptable use">
        <Bullets
          items={[
            "Do not place fraudulent or malicious orders.",
            "Do not copy our product photography or written content for commercial use.",
            "Do not attempt to disrupt or gain unauthorised access to the site.",
          ]}
        />
      </Section>

      <Section title="Liability">
        <p>
          Our responsibility for any order is limited to the value of that
          order. Nothing in these terms limits rights you have under Bangladeshi
          consumer law.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {site.legalName} · {contact.address} · {contact.email} ·{" "}
          {contact.phoneDisplay}
        </p>
      </Section>
    </ProsePage>
  );
}
