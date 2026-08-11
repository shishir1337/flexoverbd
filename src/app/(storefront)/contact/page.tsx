import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/ui/brand-icons";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  getContactSettings,
  getSiteSettings,
  getSocialSettings,
} from "@/server/services/settings";

/**
 * Generated, not a constant: the store name is admin-editable, and a static
 * metadata export would freeze whatever it was at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Contact Us",
    description: `Reach ${site.name} on WhatsApp, phone or email. We reply within 30 minutes during business hours.`,
    alternates: { canonical: "/contact" },
  };
}

const HELP_LINKS = [
  { href: "/track-order", label: "Track an order" },
  { href: "/faq", label: "Read the FAQ" },
  { href: "/shipping", label: "Delivery charges" },
  { href: "/refund-policy", label: "Returns & refunds" },
];

export default async function ContactPage() {
  const [site, contact, social] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
    getSocialSettings(),
  ]);

  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            Get in touch
          </h1>
          <p className="mt-2 text-sm text-ink-2 sm:text-base">
            WhatsApp is fastest — we usually reply within 30 minutes during
            business hours.
          </p>
        </header>

        {/* WhatsApp leads and gets the most weight, because that is where the
            volume actually is for a Bangladeshi store. */}
        <a
          href={contact.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-card border-2 border-[#25D366] bg-[#25D366]/5 p-5 tap transition-colors hover:bg-[#25D366]/10"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#25D366]">
            <WhatsAppIcon className="size-6 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold text-ink">
              Message us on WhatsApp
            </span>
            <span className="block text-sm text-ink-2 tnum">
              {contact.phoneDisplay}
            </span>
          </span>
        </a>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ContactCard icon={Phone} title="Call us" href={contact.phoneHref}>
            <span className="tnum">{contact.phoneDisplay}</span>
          </ContactCard>
          <ContactCard
            icon={Mail}
            title="Email"
            href={`mailto:${contact.email}`}
          >
            {contact.email}
          </ContactCard>
          <ContactCard icon={Clock} title="Support hours">
            {contact.hours}
          </ContactCard>
          <ContactCard icon={MapPin} title="Address">
            {contact.address}
          </ContactCard>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface-2 p-5">
          <h2 className="text-base font-extrabold text-ink">
            Before you message
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            These answer most questions instantly:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-chip border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-on"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm font-semibold text-ink">Follow us</p>
          <ul className="mt-3 flex justify-center gap-2">
            <li>
              <SocialLink
                href={social.facebook}
                label="Facebook"
                siteName={site.name}
                Icon={FacebookIcon}
              />
            </li>
            <li>
              <SocialLink
                href={social.instagram}
                label="Instagram"
                siteName={site.name}
                Icon={InstagramIcon}
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  siteName,
  Icon,
}: {
  href: string;
  label: string;
  /** Passed in rather than fetched — this is a leaf, not a boundary. */
  siteName: string;
  Icon: typeof FacebookIcon;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${siteName} on ${label}`}
      className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-600"
    >
      <Icon className="size-4.5" />
    </a>
  );
}

function ContactCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof Phone;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
        <Icon aria-hidden className="size-5 text-brand-600" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-sm text-ink-2">{children}</span>
      </span>
    </>
  );

  const base =
    "flex items-center gap-3 rounded-card border border-line bg-surface p-4";

  return href ? (
    <a
      href={href}
      className={`${base} tap transition-colors hover:border-brand-500`}
    >
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}
