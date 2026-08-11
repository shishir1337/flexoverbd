"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/guards";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in customer's saved delivery address.
 *
 * Only ever a *prefill*. `placeOrder` snapshots whatever the form submits onto
 * the order and re-derives the delivery fee from the chosen district, so a
 * stale saved address cannot quietly change what someone is charged — and
 * editing an address later must never rewrite an order already shipped.
 *
 * Guests get `null` and the form renders empty, which is the common case: the
 * store is guest-first by design.
 */

export type SavedAddress = {
  fullName: string;
  phone: string;
  districtId: string;
  area: string;
  line1: string;
  landmark: string;
};

export async function getDefaultAddress(): Promise<SavedAddress | null> {
  const session = await getSession();
  if (!session) return null;

  const address = await prisma.address.findFirst({
    where: { userId: session.user.id },
    // The explicitly-default one wins; failing that, the most recently used.
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  if (!address) return null;

  return {
    fullName: address.fullName,
    phone: address.phone,
    districtId: address.districtId,
    area: address.area,
    line1: address.line1,
    landmark: address.landmark ?? "",
  };
}

const saveSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? v)
    .refine((v) => isValidPhone(v), PHONE_ERROR),
  districtId: z.string().min(1),
  area: z.string().trim().min(2),
  line1: z.string().trim().min(4),
  landmark: z.string().trim().max(120).optional(),
});

/**
 * Remember the address just used at checkout — the "save my details" tick.
 *
 * Best-effort on purpose: it runs after an order has already been placed
 * successfully, so a failure here must never surface as a checkout error. The
 * customer's order is fine either way; all they lose is a prefill next time.
 */
export async function saveDefaultAddress(
  input: z.input<typeof saveSchema>,
): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;

  try {
    const existing = await prisma.address.findFirst({
      where: { userId: session.user.id, isDefault: true },
      select: { id: true },
    });

    if (existing) {
      await prisma.address.update({
        where: { id: existing.id },
        data: { ...d, landmark: d.landmark || null },
      });
    } else {
      await prisma.address.create({
        data: {
          ...d,
          landmark: d.landmark || null,
          userId: session.user.id,
          isDefault: true,
        },
      });
    }

    // A customer who has never given us a number cannot see their own order
    // history — orders are matched on the phone. Backfilling it here is the
    // one moment we know it is correct, because a parcel is going to it.
    if (!session.user.phone) {
      await prisma.user
        .update({ where: { id: session.user.id }, data: { phone: d.phone } })
        // A unique clash means another account already claims this number;
        // leaving it unset is better than failing the save.
        .catch(() => undefined);
    }

    return { ok: true };
  } catch (e) {
    console.error("saveDefaultAddress failed", e);
    return { ok: false };
  }
}
