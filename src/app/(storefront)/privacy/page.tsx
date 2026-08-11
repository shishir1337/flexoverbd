import type { Metadata } from "next";
import { Bullets, ProsePage, Section } from "@/components/content/prose-page";
import {
  getContactSettings,
  getSiteSettings,
} from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What data FlexOver BD collects, why we collect it, and the choices you have.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const [contact, site] = await Promise.all([
    getContactSettings(),
    getSiteSettings(),
  ]);

  return (
    <ProsePage
      title="Privacy policy"
      intro={`How ${site.name} handles your personal information.`}
      updated="August 2026"
    >
      <Section title="What we collect">
        <p>
          When you place an order we collect only what is needed to fulfil it:
        </p>
        <Bullets
          items={[
            "Your name, mobile number and delivery address.",
            "Your email address, if you choose to give one.",
            "The items you ordered, the amount, and the order history tied to your number.",
            "Basic technical data such as device type and pages visited, used to keep the site working.",
          ]}
        />
        <p>
          We do not collect payment card details. Orders are paid in cash on
          delivery.
        </p>
      </Section>

      <Section title="Why we use it">
        <Bullets
          items={[
            "To confirm, pack and deliver your order.",
            "To call or message you about that order.",
            "To handle returns, refunds and support requests.",
            "To improve the site — which products people look for, where they drop off.",
          ]}
        />
      </Section>

      <Section title="Who we share it with">
        <p>
          Only our delivery partners, and only the details they need to bring
          your parcel to you — your name, address and phone number. We do not
          sell your data to anyone, and we do not share it for advertising.
        </p>
      </Section>

      <Section title="Marketing messages">
        <p>
          If you subscribe, we send occasional offers by email or SMS. Every
          message includes a way to stop, and you can also tell us on WhatsApp
          and we will remove you.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order records are kept as long as needed for accounting and warranty
          purposes. You can ask us to delete your personal details at any time,
          and we will unless we are required to retain them.
        </p>
      </Section>

      <Section title="Your choices">
        <Bullets
          items={[
            "Ask what we hold about you.",
            "Ask us to correct anything wrong.",
            "Ask us to delete your details.",
            "Opt out of marketing at any time.",
          ]}
        />
        <p>
          To do any of these, contact us at {contact.email} or message{" "}
          {contact.phoneDisplay}.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use a small amount of local storage on your device to remember your
          cart and saved items. It is not used to track you across other
          websites.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy: {contact.email} · {contact.phoneDisplay}{" "}
          · {contact.address}.
        </p>
      </Section>
    </ProsePage>
  );
}
