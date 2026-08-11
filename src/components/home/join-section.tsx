import { Gift } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { getContactSettings } from "@/server/services/settings";
import { NewsletterForm } from "./newsletter-form";

/**
 * Final conversion block. Two paths on purpose: email for people who are still
 * browsing, WhatsApp for the large share of Bangladeshi shoppers who would
 * rather just message someone and order that way.
 */
export async function JoinSection() {
  const contact = await getContactSettings();

  return (
    <section aria-labelledby="join-heading" className="container-page">
      <div className="overflow-hidden rounded-card bg-linear-to-br from-brand-600 via-brand-500 to-brand-600 p-5 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-chip bg-surface/20 px-3 py-1 text-2xs font-bold tracking-wider text-white uppercase backdrop-blur-sm">
              <Gift aria-hidden className="size-3.5" />
              ৳100 off your first order
            </span>
            <h2
              id="join-heading"
              className="text-xl leading-tight font-extrabold text-white sm:text-3xl"
            >
              Get the deals before everyone else
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">
              New drops, flash sales and subscriber-only prices. One email a
              week, no spam — unsubscribe any time.
            </p>
          </div>

          <div className="space-y-3">
            <NewsletterForm />

            <div className="flex items-center gap-3">
              <span aria-hidden className="h-px flex-1 bg-surface/25" />
              <span className="text-xs font-semibold text-white/80">
                or order directly
              </span>
              <span aria-hidden className="h-px flex-1 bg-surface/25" />
            </div>

            <a
              href={contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-btn bg-surface text-[0.9375rem] font-bold text-ink tap transition-transform duration-200 ease-(--ease-out-soft) hover:scale-[1.01] active:scale-[0.99]"
            >
              <WhatsAppIcon className="size-5 text-[#25D366]" />
              Message us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
