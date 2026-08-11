import { createHash } from "node:crypto";

/**
 * Normalisation and hashing for Meta's customer information parameters.
 *
 * Every value Meta matches on has to be normalised *then* SHA-256 hashed, and
 * the normalisation is specific per field — lowercase for one, digits-only for
 * another, spaces stripped for a third. Getting it wrong does not produce an
 * error: Meta accepts the event and simply fails to match it to a person.
 *
 * That silence is the reason this lives in its own module rather than inline at
 * the call site. A CAPI integration that "works" — 200 responses, events
 * visible in Events Manager — while quietly matching nobody is the normal
 * failure mode, and it is invisible unless the hashing is deliberate.
 *
 * Rules are transcribed from Meta's customer information parameters page
 * (checked 9 Aug 2026). See META-CAPI.md.
 */

/** SHA-256, lowercase hex — the only digest Meta accepts. */
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Hash a value that has already been normalised.
 *
 * Empty input returns undefined rather than the hash of an empty string:
 * `e3b0c442…` is a real, constant hash that Meta would dutifully try to match
 * against every other shop sending an empty field, which is worse than sending
 * nothing at all.
 */
function hashed(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? sha256(trimmed) : undefined;
}

/** Trim, lowercase. */
export function normalizeEmail(email: string | null | undefined) {
  return hashed(email?.toLowerCase());
}

/**
 * Digits only, no leading zeros, country code included.
 *
 * Bangladeshi numbers are stored locally as `01712345678`; Meta wants
 * `8801712345678`. The leading zero is dropped rather than kept, because
 * `88001712345678` matches nothing.
 */
export function normalizePhone(phone: string | null | undefined) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;

  const withCountry = digits.startsWith("880")
    ? digits
    : `880${digits.replace(/^0+/, "")}`;
  return hashed(withCountry);
}

/** Lowercase, no punctuation. Accents are preserved — Meta hashes UTF-8. */
export function normalizeName(name: string | null | undefined) {
  return hashed(
    name
      ?.toLowerCase()
      .replace(/[.,'"`’]/g, "")
      .trim(),
  );
}

/** Lowercase, no punctuation, no spaces. */
export function normalizeCity(city: string | null | undefined) {
  return hashed(city?.toLowerCase().replace(/[^a-zঀ-৿]/g, ""));
}

/** Lowercase, no spaces or dashes. */
export function normalizeZip(zip: string | null | undefined) {
  return hashed(zip?.toLowerCase().replace(/[\s-]/g, ""));
}

/** ISO 3166-1 alpha-2, lowercase. Defaults to Bangladesh. */
export function normalizeCountry(country: string | null | undefined) {
  const code = (country ?? "bd").toLowerCase().trim();
  return hashed(code.length === 2 ? code : "bd");
}

/**
 * A stable per-person id, hashed.
 *
 * Hashing is only "recommended" by Meta for `external_id`, but this shop keys
 * customers by mobile number — an unhashed one would be plain PII sitting in
 * Meta's logs for no gain, since matching works the same either way.
 */
export function normalizeExternalId(id: string | null | undefined) {
  return hashed(id?.toLowerCase());
}

/**
 * The assembled `user_data` block.
 *
 * `client_ip_address`, `client_user_agent`, `fbp` and `fbc` are passed through
 * unhashed — Meta is explicit that hashing them breaks matching entirely.
 */
export type MetaUserData = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  zp?: string;
  country?: string;
  external_id?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
};

export function buildUserData(input: {
  email?: string | null;
  phone?: string | null;
  /** Full name; split on the first space into first and last. */
  name?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}): MetaUserData {
  const [first, ...rest] = (input.name ?? "").trim().split(/\s+/);

  const data: MetaUserData = {
    em: normalizeEmail(input.email),
    ph: normalizePhone(input.phone),
    fn: normalizeName(first),
    ln: normalizeName(rest.join(" ")),
    ct: normalizeCity(input.city),
    zp: normalizeZip(input.zip),
    country: normalizeCountry(input.country),
    external_id: normalizeExternalId(input.externalId ?? input.phone),
    // Never hashed — see the type comment above.
    client_ip_address: input.ip ?? undefined,
    client_user_agent: input.userAgent ?? undefined,
    fbp: input.fbp ?? undefined,
    fbc: input.fbc ?? undefined,
  };

  // Meta rejects nulls; absent keys are the correct way to say "unknown".
  for (const key of Object.keys(data) as (keyof MetaUserData)[]) {
    if (!data[key]) delete data[key];
  }
  return data;
}
