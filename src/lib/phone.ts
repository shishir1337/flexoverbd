/**
 * Bangladeshi mobile numbers, in one canonical shape.
 *
 * The same number reaches us written half a dozen ways — `01712345678`,
 * `+8801712345678`, `8801712345678`, `01712-345678`, `017 1234 5678`. They are
 * all the same phone, and a shopper who copies their number out of their
 * contacts gets the `+880` form more often than not.
 *
 * Rejecting those was costing orders: checkout said "Enter a valid mobile
 * number" at a number that was perfectly valid, on the last screen before
 * payment, on a store where the phone number *is* the customer record.
 *
 * So: normalise, then validate. Everything is stored as the local `01…` form,
 * because that is what staff read down the phone, what couriers expect on a
 * label, and — critically — the key that order lookup and customer history
 * group by. One canonical form or those joins silently miss.
 */

/** `01[3-9]` + 8 digits: every operator prefix currently issued in Bangladesh. */
const CANONICAL = /^01[3-9]\d{8}$/;

/**
 * Reduce any of the accepted spellings to `01XXXXXXXXX`.
 *
 * Returns null when the input cannot be a Bangladeshi mobile, so callers can
 * tell "wrong format" from "not a phone number at all".
 */
export function normalizePhone(input: string): string | null {
  // Strip everything a human might type as punctuation: spaces, dashes,
  // brackets, dots. Keep a leading + only long enough to recognise it.
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");

  // 8801712345678 -> 01712345678
  const local = digits.startsWith("880")
    ? `0${digits.slice(3)}`
    : // 1712345678 -> 01712345678 (dropped leading zero, common when the
      // number was stored without it)
      digits.length === 10 && digits.startsWith("1")
      ? `0${digits}`
      : digits;

  return CANONICAL.test(local) ? local : null;
}

/** True when the input is a Bangladeshi mobile in any accepted spelling. */
export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** The one message every phone field should show, so they cannot drift apart. */
export const PHONE_ERROR =
  "Enter a valid mobile number, e.g. 01712345678 or +8801712345678.";

/**
 * A Zod-friendly transform: accepts any spelling, stores the canonical one.
 *
 * Used as `z.string().transform(...).refine(...)` at each call site rather than
 * exported as a schema, because the surrounding schemas differ in whether the
 * field is optional.
 */
export function phoneSchemaShape() {
  return {
    transform: (value: string) => normalizePhone(value) ?? value,
    check: (value: string) => CANONICAL.test(value),
    message: PHONE_ERROR,
  };
}
