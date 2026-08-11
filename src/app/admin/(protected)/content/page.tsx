import { ImageIcon, MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { type RecordField, RecordList } from "@/components/admin/record-list";
import { requirePermission } from "@/lib/auth/guards";
import {
  listAnnouncements,
  listFaqItems,
  listNavLinks,
  listTrendingSearches,
  listTrustItems,
} from "@/server/services/admin/content";

export const instant = false;
export const metadata: Metadata = { title: "Content" };

const ANNOUNCEMENT_FIELDS: RecordField[] = [
  {
    key: "text",
    label: "Message",
    primary: true,
    hint: "One line. Shown in the bar above the header, one at a time.",
  },
  {
    key: "startsAt",
    label: "Starts",
    type: "date",
    hint: "Leave blank to start immediately.",
  },
  {
    key: "endsAt",
    label: "Ends",
    type: "date",
    hint: "Leave blank to run until you turn it off.",
  },
];

const TRENDING_FIELDS: RecordField[] = [
  {
    key: "term",
    label: "Search term",
    primary: true,
    hint: "Appears as a suggestion chip under the search box.",
  },
];

const FAQ_FIELDS: RecordField[] = [
  { key: "question", label: "Question", primary: true },
  { key: "answer", label: "Answer", type: "textarea" },
  {
    key: "group",
    label: "Group",
    hint: "Optional heading to file it under, e.g. Delivery.",
  },
  { key: "ctaLabel", label: "Button label", hint: "Optional." },
  {
    key: "ctaHref",
    label: "Button link",
    hint: "Optional, e.g. /track-order.",
  },
];

const TRUST_FIELDS: RecordField[] = [
  { key: "title", label: "Title", primary: true },
  { key: "subtitle", label: "Subtitle" },
  {
    key: "icon",
    label: "Icon",
    hint: "A lucide-react icon name, e.g. Truck, Wallet, RotateCcw, BadgeCheck.",
  },
];

const NAV_FIELDS: RecordField[] = [
  { key: "label", label: "Label", primary: true },
  { key: "href", label: "Link", hint: "A path like /offers, or a full URL." },
  {
    key: "group",
    label: "Where it appears",
    type: "select",
    options: [
      { value: "FOOTER_HELP", label: "Footer — Help" },
      { value: "FOOTER_COMPANY", label: "Footer — Company" },
      { value: "MOBILE_SHORTCUT", label: "Mobile menu — shortcut tiles" },
      { value: "MOBILE_HELP", label: "Mobile menu — help links" },
    ],
  },
  { key: "icon", label: "Icon", hint: "Optional lucide-react icon name." },
];

/**
 * Editorial content.
 *
 * One screen rather than five sidebar entries: these lists are short, they are
 * edited together (a campaign usually means an announcement *and* a banner),
 * and splitting them would mean five page loads to set one up. Banners and
 * review screenshots get their own routes because they carry images.
 */
export default async function AdminContentPage() {
  await connection();
  await requirePermission({ content: ["read"] });

  const [announcements, trending, faq, trust, navLinks] = await Promise.all([
    listAnnouncements(),
    listTrendingSearches(),
    listFaqItems(),
    listTrustItems(),
    listNavLinks(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Content"
        subtitle="The copy and links shoppers see outside the catalogue."
      />

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href="/admin/content/banners"
          className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 tap hover:border-brand-500"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
            <ImageIcon aria-hidden className="size-5 text-brand-600" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink text-sm">
              Banners
            </span>
            <span className="block text-2xs text-ink-3">
              Hero carousel and promo tiles
            </span>
          </span>
        </Link>

        <Link
          href="/admin/content/screenshots"
          className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 tap hover:border-brand-500"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
            <MessageSquareQuote aria-hidden className="size-5 text-brand-600" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink text-sm">
              Review screenshots
            </span>
            <span className="block text-2xs text-ink-3">
              The customer wall on the homepage
            </span>
          </span>
        </Link>
      </div>

      <div className="mt-5 space-y-5">
        <RecordList
          kind="announcement"
          title="Announcement bar"
          description="Shown one at a time above the header. Scheduling is honoured, so a campaign can be queued in advance."
          fields={ANNOUNCEMENT_FIELDS}
          rows={announcements}
          addLabel="Add message"
        />

        <RecordList
          kind="trending"
          title="Trending searches"
          description="Suggestion chips in the search overlay."
          fields={TRENDING_FIELDS}
          rows={trending}
          addLabel="Add term"
        />

        <RecordList
          kind="faq"
          title="FAQ"
          description="Drives /faq and the FAQPage structured data that can earn an expandable answer in search."
          fields={FAQ_FIELDS}
          rows={faq}
          addLabel="Add question"
        />

        <RecordList
          kind="trust"
          title="Trust strip"
          description="The four reassurances under the hero. Four fits the grid; more will wrap."
          fields={TRUST_FIELDS}
          rows={trust}
          addLabel="Add item"
        />

        <RecordList
          kind="navLink"
          title="Navigation links"
          description="Extra links in the header, footer and mobile menu. Categories are managed separately."
          fields={NAV_FIELDS}
          rows={navLinks}
          addLabel="Add link"
        />
      </div>
    </div>
  );
}
