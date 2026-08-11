"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";
import { tags } from "@/server/cache-tags";

/**
 * Settings mutations.
 *
 * Each group is validated by its own schema rather than accepting arbitrary
 * JSON. Settings drive prices, delivery fees and legal copy — an admin
 * accidentally clearing `freeShippingThreshold` should fail loudly at the form,
 * not silently make every order ship free.
 */

export type SettingsResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const siteSchema = z.object({
  name: z.string().trim().min(1),
  legalName: z.string().trim().min(1),
  tagline: z.string().trim().max(120),
  shortDescription: z.string().trim().max(160),
  description: z.string().trim().max(400),
  url: z.url(),
});

const contactSchema = z.object({
  phoneDisplay: z.string().trim().min(6),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?\d{8,15}$/, "Digits, optional +."),
  email: z.email(),
  address: z.string().trim().min(2),
  hours: z.string().trim().min(2),
});

const socialSchema = z.object({
  facebook: z.url().or(z.literal("")),
  instagram: z.url().or(z.literal("")),
});

const commerceSchema = z.object({
  freeShippingThreshold: z.coerce.number().int().min(0),
  returnWindowDays: z.coerce.number().int().min(0).max(365),
  maxQtyPerLine: z.coerce.number().int().min(1).max(100),
  lowStockThreshold: z.coerce.number().int().min(0),
  codAvailable: z.boolean(),
});

const SCHEMAS = {
  site: siteSchema,
  contact: contactSchema,
  social: socialSchema,
  commerce: commerceSchema,
} as const;

export type SettingsGroup = keyof typeof SCHEMAS;

export async function saveSettings(
  group: SettingsGroup,
  values: unknown,
): Promise<SettingsResult> {
  const session = await requirePermission({ settings: ["update"] });

  const schema = SCHEMAS[group];
  if (!schema) return { ok: false, error: "Unknown settings group." };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the form.", fieldErrors };
  }

  const before = await prisma.setting.findUnique({ where: { key: group } });

  // Merged, not replaced: each form edits a subset of its group, and a partial
  // save must not drop the keys it does not render.
  const merged = {
    ...((before?.value as object) ?? {}),
    ...parsed.data,
  };

  await prisma.setting.upsert({
    where: { key: group },
    update: { value: merged as never },
    create: { key: group, value: merged as never },
  });

  await recordAudit({
    userId: session.user.id,
    action: `settings.${group}.update`,
    entity: "Setting",
    entityId: group,
    before: (before?.value as never) ?? undefined,
    after: merged as never,
  });

  revalidateTag(tags.settings, "max");
  revalidateTag(tags.setting(group), "max");
  return { ok: true };
}

/* ------------------------------------------------------------- Delivery */

const zoneSchema = z.object({
  id: z.string().min(1),
  fee: z.coerce.number().int().min(0),
  etaLabel: z.string().trim().min(2),
});

export async function saveDeliveryZone(
  input: z.input<typeof zoneSchema>,
): Promise<SettingsResult> {
  const session = await requirePermission({ settings: ["update"] });

  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a whole number and an ETA label." };
  }
  const { id, fee, etaLabel } = parsed.data;

  const before = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "Zone not found." };

  await prisma.deliveryZone.update({ where: { id }, data: { fee, etaLabel } });

  await recordAudit({
    userId: session.user.id,
    action: "settings.delivery.update",
    entity: "DeliveryZone",
    entityId: id,
    before: { fee: before.fee, etaLabel: before.etaLabel },
    after: { fee, etaLabel },
  });

  revalidateTag(tags.delivery, "max");
  revalidateTag(tags.settings, "max");
  return { ok: true };
}

const newZoneSchema = z.object({
  name: z.string().trim().min(2, "Give the zone a name.").max(40),
  fee: z.coerce.number().int().min(0),
  etaLabel: z.string().trim().min(2, "Say how long delivery takes."),
});

/**
 * Add a delivery zone.
 *
 * Zones were seeded and never creatable, so a shop that grew beyond "inside
 * Dhaka / outside Dhaka" — a courier rate for Chattogram, a same-day tier —
 * had no way to express it without a database migration.
 *
 * A new zone starts with no districts. That is deliberate rather than a gap:
 * a district belongs to exactly one zone, so filling a new one means *moving*
 * districts out of an existing zone, and that silently reprices live orders in
 * flight. Moving them is a separate, explicit step.
 */
export async function createDeliveryZone(
  input: z.input<typeof newZoneSchema>,
): Promise<SettingsResult> {
  const session = await requirePermission({ settings: ["update"] });

  const parsed = newZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { name, fee, etaLabel } = parsed.data;

  const clash = await prisma.deliveryZone.findUnique({ where: { name } });
  if (clash) return { ok: false, error: `"${name}" already exists.` };

  const last = await prisma.deliveryZone.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const zone = await prisma.deliveryZone.create({
    data: { name, fee, etaLabel, position: (last?.position ?? -1) + 1 },
  });

  await recordAudit({
    userId: session.user.id,
    action: "settings.delivery.create",
    entity: "DeliveryZone",
    entityId: zone.id,
    after: { name, fee, etaLabel },
  });

  revalidateTag(tags.delivery, "max");
  revalidateTag(tags.settings, "max");
  return { ok: true };
}

/**
 * Remove a zone, but only while nothing depends on it.
 *
 * A district's `zoneId` is required, so deleting a zone that still owns
 * districts would either fail at the database or orphan them — and an orphaned
 * district is an address checkout cannot price. Refusing with the count is more
 * useful than either.
 */
export async function deleteDeliveryZone(id: string): Promise<SettingsResult> {
  const session = await requirePermission({ settings: ["update"] });

  const zone = await prisma.deliveryZone.findUnique({
    where: { id },
    include: { _count: { select: { districts: true } } },
  });
  if (!zone) return { ok: false, error: "Zone not found." };

  if (zone._count.districts > 0) {
    return {
      ok: false,
      error: `${zone.name} still covers ${zone._count.districts} district${
        zone._count.districts === 1 ? "" : "s"
      }. Move them to another zone first.`,
    };
  }

  await prisma.deliveryZone.delete({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "settings.delivery.delete",
    entity: "DeliveryZone",
    entityId: id,
    before: { name: zone.name, fee: zone.fee, etaLabel: zone.etaLabel },
  });

  revalidateTag(tags.delivery, "max");
  revalidateTag(tags.settings, "max");
  return { ok: true };
}

const districtZoneSchema = z.object({
  districtId: z.string().min(1),
  zoneId: z.string().min(1),
});

/**
 * Move a district into a different delivery zone.
 *
 * This is the half that makes a new zone useful: a zone with no districts
 * prices nothing. It is deliberately a separate, explicit action rather than
 * part of creating a zone, because it changes what customers in that district
 * are charged the moment it saves.
 *
 * Orders already placed are unaffected — every order snapshots its delivery fee
 * at checkout, so this reprices future orders only. Worth knowing, because the
 * opposite would be a quiet way to change money owed on parcels already out.
 */
export async function setDistrictZone(
  input: z.input<typeof districtZoneSchema>,
): Promise<SettingsResult> {
  const session = await requirePermission({ settings: ["update"] });

  const parsed = districtZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { districtId, zoneId } = parsed.data;

  const [district, zone] = await Promise.all([
    prisma.district.findUnique({
      where: { id: districtId },
      include: { zone: { select: { name: true } } },
    }),
    prisma.deliveryZone.findUnique({ where: { id: zoneId } }),
  ]);
  if (!district) return { ok: false, error: "District not found." };
  if (!zone) return { ok: false, error: "Zone not found." };
  if (district.zoneId === zoneId) return { ok: true };

  await prisma.district.update({
    where: { id: districtId },
    data: { zoneId },
  });

  await recordAudit({
    userId: session.user.id,
    action: "settings.district.zone",
    entity: "District",
    entityId: districtId,
    before: { district: district.name, zone: district.zone.name },
    after: { district: district.name, zone: zone.name },
  });

  revalidateTag(tags.delivery, "max");
  revalidateTag(tags.settings, "max");
  return { ok: true };
}
