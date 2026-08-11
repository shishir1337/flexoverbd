import { Clock, Mail, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/ui/brand-icons";
import { PaymentLogo } from "@/components/ui/payment-logo";
import { paymentMethods } from "@/lib/site";
import { formatBDT } from "@/lib/utils";
import { getCurrentYear } from "@/server/clock";
import { getAllCategories } from "@/server/services/categories";
import { getNavLinks } from "@/server/services/content";
import {
  getCommerceSettings,
  getContactSettings,
  getSiteSettings,
  getSocialSettings,
  getZonePair,
} from "@/server/services/settings";
import { Logo } from "./logo";

export async function SiteFooter() {
  const [
    year,
    categories,
    site,
    contact,
    commerce,
    social,
    zones,
    helpLinks,
    companyLinks,
  ] = await Promise.all([
    getCurrentYear(),
    getAllCategories(),
    getSiteSettings(),
    getContactSettings(),
    getCommerceSettings(),
    getSocialSettings(),
    getZonePair(),
    getNavLinks("FOOTER_HELP"),
    getNavLinks("FOOTER_COMPANY"),
  ]);

  // WhatsApp is not a "social" setting — it is the support number, so the icon
  // links to the same derived wa.me URL the rest of the site uses.
  const socialLinks = [
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: contact.whatsappUrl, label: "WhatsApp", Icon: WhatsAppIcon },
  ].filter((l) => l.href);

  return (
    <footer className="mt-12 border-t border-line bg-surface-2 sm:mt-16">
      {/* Delivery facts up top — this is the single most asked question in BD
          ecommerce, so it gets prime position rather than a policy page. */}
      <div className="border-b border-line bg-surface">
        <div className="container-page grid gap-3 py-6 sm:grid-cols-3">
          <FooterFact
            Icon={Truck}
            title="Delivery charge"
            lines={[
              `Inside Dhaka ${formatBDT(zones.inside.fee)} · ${zones.inside.etaLabel}`,
              `Outside Dhaka ${formatBDT(zones.outside.fee)} · ${zones.outside.etaLabel}`,
            ]}
          />
          <FooterFact
            Icon={ShieldCheck}
            title="Buy with confidence"
            lines={[
              "Cash on delivery in all 64 districts",
              `${commerce.returnWindowDays} days easy return`,
            ]}
          />
          <FooterFact
            Icon={Clock}
            title="Support hours"
            lines={[contact.hours, "Reply within 30 minutes on WhatsApp"]}
          />
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <Logo markSize={52} />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-2">
            {site.shortDescription}. Fashion, gadgets, home essentials, beauty
            and more — delivered fast across Bangladesh.
          </p>

          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href={contact.phoneHref}
                className="flex min-h-9 items-center gap-2.5 text-ink-2 tap hover:text-brand-on"
              >
                <Phone aria-hidden className="size-4 shrink-0 text-brand-600" />
                <span className="tnum">{contact.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex min-h-9 items-center gap-2.5 text-ink-2 tap hover:text-brand-on"
              >
                <Mail aria-hidden className="size-4 shrink-0 text-brand-600" />
                {contact.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-ink-2">
              <MapPin aria-hidden className="size-4 shrink-0 text-brand-600" />
              {contact.address}
            </li>
          </ul>

          <ul className="mt-5 flex items-center gap-2">
            {socialLinks.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${site.name} on ${label}`}
                  className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <Icon className="size-4.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <FooterColumn title="Shop by category" className="lg:col-span-3">
          {categories.map((c) => (
            <FooterLink key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Help & support" className="lg:col-span-2">
          {helpLinks.map((l) => (
            <FooterLink key={l.id} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Company" className="lg:col-span-3">
          {companyLinks.map((l) => (
            <FooterLink key={l.id} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-3">We accept</p>
            <ul className="flex flex-wrap items-center gap-2">
              {paymentMethods.map((m) => (
                <li key={m.slug}>
                  <PaymentLogo method={m} />
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ink-3">
            © {year} {site.legalName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Clears the fixed mobile bottom nav so the last row is never trapped. */}
      <div aria-hidden className="h-16 pb-safe lg:hidden" />
    </footer>
  );
}

function FooterFact({
  Icon,
  title,
  lines,
}: {
  Icon: typeof Truck;
  title: string;
  lines: string[];
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
        <Icon aria-hidden className="size-5 text-brand-600" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        {lines.map((l) => (
          <p key={l} className="text-xs leading-relaxed text-ink-2">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // h2, not h3: these are top-level sections of the footer landmark, and
    // they follow the page h1 in document order — an h3 there skips a level
    // and breaks heading navigation for screen-reader users.
    <div className={className}>
      <h2 className="mb-3 text-sm font-extrabold text-ink">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 block rounded px-2 py-1.5 text-sm text-ink-2 tap transition-colors hover:text-brand-on"
      >
        {children}
      </Link>
    </li>
  );
}
