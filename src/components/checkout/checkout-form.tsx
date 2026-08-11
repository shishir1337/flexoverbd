"use client";

import {
  AlertCircle,
  Banknote,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { MetaInitiateCheckout } from "@/components/meta-events";
import { useCommerce, useZoneOptions } from "@/components/settings-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { divisions, zoneForDistrict } from "@/data/districts";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { cn, formatBDT } from "@/lib/utils";
import { variantLabel } from "@/lib/variants";
import {
  type SavedAddress,
  saveDefaultAddress,
} from "@/server/services/address-actions";
import { placeOrder } from "@/server/services/checkout";
import {
  type CouponPreview,
  previewCoupon,
} from "@/server/services/coupon-actions";

type Errors = Partial<Record<string, string>>;

/**
 * Guest checkout, cash on delivery.
 *
 * No account is required and none is implied — the optional "save my details"
 * box at the end is the only mention of one. Forcing registration before a
 * first purchase is the largest avoidable drop-off in Bangladeshi ecommerce,
 * where most orders are one-off and paid in cash.
 */
export function CheckoutForm({ saved }: { saved?: SavedAddress | null }) {
  const router = useRouter();
  const commerce = useCommerce();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<CouponPreview | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const zoneOptions = useZoneOptions();
  const { lines, hydrated, subtotal, clear } = useCart();
  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    district: useId(),
    area: useId(),
    street: useId(),
    landmark: useId(),
    notes: useId(),
    coupon: useId(),
  };

  // Prefilled from the signed-in customer's saved address when there is one.
  // Only the initial value — everything after this is theirs to change, and
  // `placeOrder` prices the order from whatever is actually submitted.
  const [values, setValues] = useState({
    name: saved?.fullName ?? "",
    phone: saved?.phone ?? "",
    email: "",
    district: saved?.districtId ?? "",
    area: saved?.area ?? "",
    street: saved?.line1 ?? "",
    landmark: saved?.landmark ?? "",
    notes: "",
    // Pre-ticked for someone who already has an address saved: they have
    // opted in once, and unticking is the deliberate act now.
    createAccount: Boolean(saved),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  /** Server-side failures (sold out, undeliverable district, unexpected). */
  const [formError, setFormError] = useState<string | null>(null);

  // Delivery is priced off the district actually chosen, not a separate
  // toggle — one source of truth, so the quote cannot contradict the address.
  const zone = values.district ? zoneForDistrict(values.district) : null;
  const baseFee = zoneOptions.find((o) => o.key === zone)?.fee ?? 0;

  // Must mirror placeOrder() exactly, or the quote shown here contradicts what
  // the server charges. Free when the basket clears the threshold, or when
  // every item carries its own free-delivery promise.
  const allFreeDelivery =
    lines.length > 0 && lines.every((l) => l.freeDelivery);
  const qualifiesFree =
    subtotal >= commerce.freeShippingThreshold || allFreeDelivery;
  const couponFreeDelivery = applied?.ok === true && applied.freeDelivery;
  const deliveryFee =
    qualifiesFree || couponFreeDelivery || !zone ? 0 : baseFee;
  const discount = applied?.ok === true ? applied.discount : 0;
  const total = subtotal + deliveryFee - discount;

  async function applyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    setCouponPending(true);
    // Sent with the *current* preview figures. The server re-derives both from
    // the database at order time, so this is only ever a quote.
    const result = await previewCoupon({
      code,
      subtotal,
      deliveryFee: qualifiesFree || !zone ? 0 : baseFee,
      phone: normalizePhone(values.phone) ?? (values.phone.trim() || undefined),
    });
    setApplied(result);
    setCouponPending(false);
  }

  function set<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};

    if (values.name.trim().length < 3) {
      next.name = "Please enter your full name.";
    }

    // Any spelling is accepted — +880, 880, 01, with or without punctuation.
    // normalizePhone does the reducing; see @/lib/phone.
    if (!isValidPhone(values.phone)) {
      next.phone = PHONE_ERROR;
    }

    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
      next.email = "That email doesn't look right.";
    }
    if (!values.district) next.district = "Choose your district.";
    if (values.area.trim().length < 2) {
      next.area = "Enter your area, thana or upazila.";
    }
    if (values.street.trim().length < 8) {
      next.street = "Add house, road and any other detail the courier needs.";
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Send focus to the first problem rather than making them hunt.
      const firstKey = Object.keys(found)[0] as keyof typeof ids;
      document.getElementById(ids[firstKey])?.focus();
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Only what was chosen is sent. Every price, the delivery fee and the
    // total are recomputed on the server from the database — the totals shown
    // above are a preview, not an instruction.
    const result = await placeOrder({
      name: values.name.trim(),
      phone: normalizePhone(values.phone) ?? values.phone.trim(),
      email: values.email.trim() || undefined,
      district: values.district,
      area: values.area.trim(),
      line1: values.street.trim(),
      landmark: values.landmark.trim() || undefined,
      notes: values.notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        colour: l.variant?.colour ?? null,
        size: l.variant?.size ?? null,
        qty: l.qty,
      })),
      couponCode: applied?.ok === true ? applied.code : undefined,
    });

    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.error);
      if (result.fieldErrors) {
        // Server field names map to the form's own where they differ.
        const mapped: Errors = {};
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          mapped[(key === "line1" ? "street" : key) as keyof Errors] = message;
        }
        setErrors(mapped);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // After the order exists, never before: this is a convenience, and a
    // failure here must not turn a placed order into an error message.
    if (values.createAccount) {
      void saveDefaultAddress({
        fullName: values.name.trim(),
        phone: normalizePhone(values.phone) ?? values.phone.trim(),
        districtId: values.district,
        area: values.area.trim(),
        line1: values.street.trim(),
        landmark: values.landmark.trim() || undefined,
      });
    }

    clear();
    router.push(`/checkout/success?order=${result.orderNumber}`);
  }

  if (!hydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[32rem] rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-card border border-line bg-surface-2 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface">
          <ShoppingBag aria-hidden className="size-7 text-ink-4" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">
          There is nothing to check out
        </h2>
        <p className="mt-1 max-w-sm text-sm text-ink-2">
          Add something to your cart first and it will appear here.
        </p>
        <Link
          href="/categories"
          className={buttonStyles("primary", "md", "mt-6")}
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      {/* Rendered here rather than on the page, which is a server component
          and cannot see a cart that lives in the browser. Guards internally
          against firing while the cart is still hydrating. */}
      <MetaInitiateCheckout
        value={subtotal}
        numItems={lines.reduce((n, l) => n + l.qty, 0)}
        slugs={lines.map((l) => l.slug)}
      />
      <div className="space-y-5">
        {/* Server-side rejections: sold out mid-checkout, undeliverable
            district, or an unexpected failure. Placed above the first field
            because the cause is usually not one field. */}
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-btn bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
            {formError}
          </p>
        )}

        <Section title="Contact details" step={1}>
          <Field
            id={ids.name}
            label="Full name"
            required
            error={errors.name}
            value={values.name}
            onChange={(v) => set("name", v)}
            autoComplete="name"
            placeholder="e.g. Rahim Uddin"
          />
          <Field
            id={ids.phone}
            label="Mobile number"
            required
            error={errors.phone}
            value={values.phone}
            onChange={(v) => set("phone", v)}
            autoComplete="tel"
            inputMode="tel"
            type="tel"
            placeholder="01712-345678"
            hint="We call this number before delivery."
          />
          <Field
            id={ids.email}
            label="Email"
            optional
            error={errors.email}
            value={values.email}
            onChange={(v) => set("email", v)}
            autoComplete="email"
            inputMode="email"
            type="email"
            placeholder="you@example.com"
            hint="Only for the order confirmation. Leave blank if you prefer."
          />
        </Section>

        <Section title="Delivery address" step={2}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={ids.district}
                className="text-sm font-semibold text-ink"
              >
                District <span className="text-danger">*</span>
              </label>
              <select
                id={ids.district}
                value={values.district}
                onChange={(e) => set("district", e.target.value)}
                aria-invalid={errors.district ? true : undefined}
                aria-describedby={
                  errors.district ? `${ids.district}-err` : undefined
                }
                className={cn(
                  "h-12 rounded-btn border bg-surface px-3 text-ink",
                  errors.district ? "border-danger" : "border-line",
                )}
              >
                <option value="">Select district</option>
                {divisions.map((division) => (
                  <optgroup
                    key={division.name}
                    label={`${division.name} Division`}
                  >
                    {division.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.district && (
                <p
                  id={`${ids.district}-err`}
                  role="alert"
                  className="text-xs text-danger"
                >
                  {errors.district}
                </p>
              )}
            </div>

            <Field
              id={ids.area}
              label="Area / Thana"
              required
              error={errors.area}
              value={values.area}
              onChange={(v) => set("area", v)}
              autoComplete="address-level2"
              placeholder="e.g. Dhanmondi"
            />
          </div>

          <Field
            id={ids.street}
            label="House, road & block"
            required
            error={errors.street}
            value={values.street}
            onChange={(v) => set("street", v)}
            autoComplete="street-address"
            placeholder="e.g. House 12, Road 5, Block B"
            multiline
          />

          <Field
            id={ids.landmark}
            label="Landmark"
            optional
            value={values.landmark}
            onChange={(v) => set("landmark", v)}
            placeholder="e.g. beside Popular Diagnostic"
            hint="Helps the rider find you faster."
          />

          {zone && (
            <p className="flex items-center gap-2 rounded-btn bg-brand-soft px-3 py-2.5 text-sm text-ink-2">
              <Truck aria-hidden className="size-4 shrink-0 text-brand-600" />
              {(() => {
                const option = zoneOptions.find((o) => o.key === zone);
                return `${option?.label ?? "Delivery"} — delivered in ${
                  option?.eta ?? "2–4 days"
                }`;
              })()}
            </p>
          )}
        </Section>

        <Section title="Payment" step={3}>
          <div className="flex items-start gap-3 rounded-btn border-2 border-brand-500 bg-brand-soft p-3.5">
            <Banknote
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-brand-600"
            />
            <div>
              <p className="text-sm font-bold text-ink">Cash on Delivery</p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Pay the courier in cash when your parcel arrives. Check the
                product before you pay.
              </p>
            </div>
          </div>
          <p className="text-xs text-ink-3">
            Online payment with bKash, Nagad and cards is coming soon.
          </p>

          <Field
            id={ids.notes}
            label="Order notes"
            optional
            value={values.notes}
            onChange={(v) => set("notes", v)}
            placeholder="Anything the rider or our team should know"
            multiline
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={values.createAccount}
              onChange={(e) => set("createAccount", e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand-600"
            />
            <span>
              Save my details for next time
              <span className="block text-xs text-ink-3">
                Optional. You can order without an account.
              </span>
            </span>
          </label>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-28">
        <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-ink">
            Your order ({lines.length})
          </h2>

          <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {line.imageReady ? (
                    <Image
                      src={line.imageSrc}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center">
                      <ShoppingBag
                        aria-hidden
                        className="size-5 text-ink-4/50"
                      />
                    </span>
                  )}
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-scrim text-[10px] font-bold text-white tnum">
                    {line.qty}
                  </span>
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
                  <span className="clamp-2">{line.title}</span>
                  {line.variant && (
                    <span className="block text-xs text-ink-3">
                      {variantLabel(line.variant)}
                    </span>
                  )}
                </span>
                <span
                  data-price
                  className="shrink-0 text-sm font-semibold text-ink"
                >
                  {formatBDT(line.price * line.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line pt-4">
            <label
              htmlFor={ids.coupon}
              className="block font-semibold text-ink text-sm"
            >
              Promo code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={ids.coupon}
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  // A code that no longer matches what is typed must stop
                  // being shown as applied, or the total is a lie.
                  setApplied(null);
                }}
                placeholder="e.g. FLEX100"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 font-mono text-base text-ink uppercase placeholder:font-sans placeholder:normal-case placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponPending || !coupon.trim()}
                className="h-11 shrink-0 rounded-btn border border-line px-4 font-semibold text-ink-2 text-sm tap hover:border-brand-500 disabled:opacity-40"
              >
                {couponPending ? "…" : "Apply"}
              </button>
            </div>
            {applied?.ok === false && (
              <p
                role="alert"
                className="mt-1.5 font-medium text-danger text-xs"
              >
                {applied.message}
              </p>
            )}
            {applied?.ok === true && (
              <p className="mt-1.5 font-medium text-success text-xs">
                {applied.description} applied.
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal</dt>
              <dd data-price className="font-semibold text-ink">
                {formatBDT(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Delivery</dt>
              <dd className="font-semibold">
                {!zone ? (
                  <span className="text-ink-3">Choose a district</span>
                ) : deliveryFee === 0 ? (
                  <span className="text-success">Free</span>
                ) : (
                  <span data-price className="text-ink">
                    {formatBDT(deliveryFee)}
                  </span>
                )}
              </dd>
            </div>
            {discount > 0 && applied?.ok === true && (
              <div className="flex justify-between">
                <dt className="text-ink-2">
                  Discount{" "}
                  <span className="font-semibold text-success">
                    {applied.code}
                  </span>
                </dt>
                <dd data-price className="font-semibold text-success">
                  −{formatBDT(discount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-extrabold text-ink">Total</dt>
              <dd data-price className="font-extrabold text-ink">
                {formatBDT(total)}
              </dd>
            </div>
          </dl>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-4 w-full"
          >
            {submitting
              ? "Placing order…"
              : `Place order · ${formatBDT(total)}`}
          </Button>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-3">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            No payment is taken now. You pay cash on delivery.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-3">
            <ShieldCheck
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-success"
            />
            {commerce.returnWindowDays}-day return if it is not right.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-extrabold text-ink">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {step}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required = false,
  optional = false,
  multiline = false,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  autoComplete?: string;
  placeholder?: string;
}) {
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: cn(
      "w-full rounded-btn border bg-surface px-3 text-ink placeholder:text-ink-4",
      "focus:border-brand-500 focus:outline-none",
      error ? "border-danger" : "border-line",
      multiline ? "min-h-20 py-2.5" : "h-12",
    ),
    ...rest,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label} {required && <span className="text-danger">*</span>}
        {optional && <span className="font-normal text-ink-3">(optional)</span>}
      </label>

      {multiline ? <textarea {...shared} /> : <input {...shared} />}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
