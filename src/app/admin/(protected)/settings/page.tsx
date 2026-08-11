import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { activeTab, type TabDef, Tabs } from "@/components/admin/tabs";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getTrackingStatus } from "@/server/services/tracking-settings";
import { DeliveryZones } from "./delivery-zones";
import { DistrictZones } from "./district-zones";
import { type FieldSpec, SettingsForm } from "./settings-form";
import { TrackingForm } from "./tracking-form";

export const instant = false;
export const metadata: Metadata = { title: "Settings" };

/**
 * Store settings.
 *
 * Every value here was hardcoded in `src/lib/site.ts` before the backend
 * landed — the phone number alone rendered in six places. Changing any of it
 * now takes a save, not a deploy.
 */

const SITE_FIELDS: FieldSpec[] = [
  { key: "name", label: "Store name" },
  {
    key: "legalName",
    label: "Legal name",
    hint: "Used in the footer copyright.",
  },
  { key: "tagline", label: "Tagline" },
  { key: "shortDescription", label: "Short description" },
  {
    key: "description",
    label: "Full description",
    type: "textarea",
    hint: "Default meta description.",
  },
  {
    key: "url",
    label: "Site URL",
    hint: "Used for canonical links and the sitemap.",
  },
];

const CONTACT_FIELDS: FieldSpec[] = [
  { key: "phoneDisplay", label: "Phone (displayed)" },
  {
    key: "whatsapp",
    label: "WhatsApp number",
    hint: "With country code, e.g. +8801738121614.",
  },
  { key: "email", label: "Support email" },
  { key: "address", label: "Address" },
  { key: "hours", label: "Support hours" },
];

const SOCIAL_FIELDS: FieldSpec[] = [
  { key: "facebook", label: "Facebook URL" },
  { key: "instagram", label: "Instagram URL" },
];

const COMMERCE_FIELDS: FieldSpec[] = [
  {
    key: "freeShippingThreshold",
    label: "Free delivery over (৳)",
    type: "number",
    hint: "Orders at or above this ship free. Checkout enforces it server-side.",
  },
  { key: "returnWindowDays", label: "Return window (days)", type: "number" },
  { key: "maxQtyPerLine", label: "Max quantity per item", type: "number" },
  {
    key: "lowStockThreshold",
    label: "Low stock warning at",
    type: "number",
    hint: 'Drives the "Only N left" badge.',
  },
  {
    key: "codAvailable",
    label: "Cash on delivery available",
    type: "checkbox",
  },
];

/** Grouped by the job being done, not by which table the values live in. */
const TABS: TabDef[] = [
  { key: "store", label: "Store" },
  { key: "contact", label: "Contact" },
  { key: "commerce", label: "Commerce" },
  { key: "delivery", label: "Delivery" },
  { key: "tracking", label: "Tracking" },
];

export default async function AdminSettingsPage(
  props: PageProps<"/admin/settings">,
) {
  await connection();
  await requirePermission({ settings: ["read"] });

  const [rows, zones, districts] = await Promise.all([
    prisma.setting.findMany({
      where: { key: { in: ["site", "contact", "social", "commerce"] } },
    }),
    prisma.deliveryZone.findMany({
      include: { _count: { select: { districts: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.district.findMany({
      select: {
        id: true,
        name: true,
        zoneId: true,
        division: { select: { name: true } },
      },
      orderBy: [{ division: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const byKey = Object.fromEntries(
    rows.map((r) => [r.key, r.value as Record<string, unknown>]),
  );

  const sp = await props.searchParams;
  const active = activeTab(TABS, sp.tab);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Store-wide values used across the storefront, checkout and SEO."
      />

      {/* Five stacked cards meant the delivery fee — the one staff change most
          often — sat below four screens of copy nobody was editing. Grouping
          them puts each job one click away instead of one scroll. */}
      <Tabs
        tabs={TABS}
        active={active}
        href={(key) =>
          key === TABS[0].key ? "/admin/settings" : `/admin/settings?tab=${key}`
        }
      />

      <div className="mt-5 space-y-5">
        {active === "store" && (
          <>
            <SettingsForm
              group="site"
              title="Store identity"
              description="Name, tagline and the descriptions used in search results."
              fields={SITE_FIELDS}
              initial={byKey.site ?? {}}
            />
            <SettingsForm
              group="social"
              title="Social profiles"
              fields={SOCIAL_FIELDS}
              initial={byKey.social ?? {}}
            />
          </>
        )}

        {active === "contact" && (
          <SettingsForm
            group="contact"
            title="Contact"
            description="Shown in the header, footer, mobile menu, product pages and the WhatsApp button."
            fields={CONTACT_FIELDS}
            initial={byKey.contact ?? {}}
          />
        )}

        {active === "commerce" && (
          <SettingsForm
            group="commerce"
            title="Commerce rules"
            description="These change what customers are charged — checkout recomputes every order against them."
            fields={COMMERCE_FIELDS}
            initial={byKey.commerce ?? {}}
          />
        )}

        {active === "tracking" && (
          <TrackingForm status={await getTrackingStatus()} />
        )}

        {active === "delivery" && (
          <>
            <DeliveryZones
              zones={zones.map((z) => ({
                id: z.id,
                name: z.name,
                fee: z.fee,
                etaLabel: z.etaLabel,
                districtCount: z._count.districts,
              }))}
            />
            <DistrictZones
              zones={zones.map((z) => ({ id: z.id, name: z.name }))}
              districts={districts.map((d) => ({
                id: d.id,
                name: d.name,
                division: d.division.name,
                zoneId: d.zoneId,
              }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
