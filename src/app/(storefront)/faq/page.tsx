import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/content/prose-page";
import { getFaqEntries } from "@/server/services/content";
import { getSiteSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about delivery, cash on delivery, returns, order tracking and product authenticity at FlexOver BD.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const [site, faqs] = await Promise.all([getSiteSettings(), getFaqEntries()]);

  // FAQPage structured data can earn an expandable answer block in search,
  // which is worth having for exactly these delivery and payment questions.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be raw text. JSON.stringify escapes the values, and they are admin-authored, never visitor input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProsePage
        title="Frequently asked questions"
        intro={`The things customers ask us most about ordering from ${site.name}.`}
      >
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {faqs.map((item) => (
            // <details> gives an accessible, keyboard-operable accordion with
            // no JavaScript, and it stays open when the browser finds text.
            <details key={item.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-ink tap [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-lg leading-none text-ink-3 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-ink-2">
                <p>{item.answer}</p>
                {item.ctaHref && item.ctaLabel && (
                  <Link
                    href={item.ctaHref}
                    className="mt-1 inline-flex min-h-11 items-center font-semibold text-brand-on tap hover:underline"
                  >
                    {item.ctaLabel} →
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>

        <p className="text-sm text-ink-2">
          Still stuck?{" "}
          <Link
            href="/contact"
            className="font-semibold text-brand-on hover:underline"
          >
            Get in touch
          </Link>{" "}
          — we usually reply on WhatsApp within 30 minutes during business
          hours.
        </p>
      </ProsePage>
    </>
  );
}
