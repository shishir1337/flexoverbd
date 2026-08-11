"use server";

import { z } from "zod";
import type { Order } from "@/lib/orders";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { findOrder, findOrdersByPhone, toStorefrontOrder } from "./orders";

/**
 * Guest order lookup, as a Server Action.
 *
 * This replaces the localStorage version, which only ever worked on the phone
 * the order was placed from — the single most reported gap in the demo. Orders
 * now live in Postgres, so a customer who ordered on their partner's phone can
 * still find their parcel.
 *
 * ## Why this is not a bare lookup
 *
 * An order number is `FB-YYMMDD-XXXX`: four random digits inside a known date.
 * That is nine thousand guesses to walk a day's orders, and each one used to
 * return a full name, mobile number, street address and delivery notes. A
 * mobile number is worse — no guessing needed at all.
 *
 * So two rules, applied server-side because the client is not a place to
 * enforce anything:
 *
 *  - An **order number** must be presented together with the mobile number on
 *    that order. Two secrets, and the customer has both on their confirmation.
 *    This closes enumeration completely.
 *  - A **mobile number on its own** still lists that number's orders, because
 *    "where is my parcel" is the whole point of the page — but the address,
 *    landmark and delivery notes are stripped, and the name is reduced to a
 *    first name and an initial. Somebody who types a stranger's number learns
 *    that they bought a shirt; they do not learn where the stranger lives.
 */

// Accepts +880 / 880 / 01 spellings; see @/lib/phone.
const phonePattern = { test: (v: string) => isValidPhone(v) };

const inputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(4, "Enter an order number or your mobile number.")
    .max(40),
  /** Required alongside an order number; ignored when the query is a phone. */
  phone: z.string().trim().max(20).optional(),
});

export type TrackResult =
  | { ok: true; orders: Order[]; redacted: boolean }
  | { ok: false; error: string; needsPhone?: boolean };

/** "Rahim Uddin" becomes "Rahim U." */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Everything that would let a stranger find the customer, removed. Status,
 * items and totals stay, because those are what tracking is for.
 */
function redact(order: Order): Order {
  return {
    ...order,
    customer: {
      name: maskName(order.customer.name),
      phone: `${order.customer.phone.slice(0, 3)}••••${order.customer.phone.slice(-2)}`,
      email: undefined,
    },
    address: {
      district: order.address.district,
      area: order.address.area,
      street: "•••",
      landmark: undefined,
    },
    notes: undefined,
  };
}

export async function trackOrder(
  rawQuery: string,
  rawPhone?: string,
): Promise<TrackResult> {
  const parsed = inputSchema.safeParse({ query: rawQuery, phone: rawPhone });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { query: rawParsedQuery, phone: rawParsedPhone } = parsed.data;

  // Reduce both to the canonical 01… form before anything is compared or
  // queried. Orders store the canonical form, so a shopper who typed
  // +8801712345678 would otherwise fail an exact-match check against their own
  // order — the number is right, only the spelling differs.
  const query = normalizePhone(rawParsedQuery) ?? rawParsedQuery;
  const phone = rawParsedPhone
    ? (normalizePhone(rawParsedPhone) ?? rawParsedPhone)
    : rawParsedPhone;

  try {
    if (/^FB-/i.test(query)) {
      if (!phone || !phonePattern.test(phone)) {
        return {
          ok: false,
          needsPhone: true,
          error:
            "Also enter the mobile number the order was placed with, so we know it is yours.",
        };
      }

      const order = await findOrder(query);
      // Deliberately the same response whether the order does not exist or the
      // number does not match it — telling those apart is exactly the signal an
      // enumeration attempt needs.
      if (!order || order.customerPhone !== phone) {
        return { ok: true, orders: [], redacted: false };
      }
      return { ok: true, orders: [toStorefrontOrder(order)], redacted: false };
    }

    if (!phonePattern.test(query)) {
      return {
        ok: false,
        error: "Enter an order number starting FB-, or a mobile number.",
      };
    }

    const orders = await findOrdersByPhone(query);
    return {
      ok: true,
      // Knowing a mobile number is not proof of owning it, so these come back
      // with the address removed.
      orders: orders.map((o) => redact(toStorefrontOrder(o))),
      redacted: orders.length > 0,
    };
  } catch (e) {
    console.error("trackOrder failed", e);
    return {
      ok: false,
      error: "We could not look that up right now. Please try again.",
    };
  }
}
