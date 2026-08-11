/**
 * Brand facts that are *not* admin-editable.
 *
 * Everything a client can change — store name, phone number, delivery fees,
 * the free-shipping threshold — now lives in the `Setting` and `DeliveryZone`
 * tables and is read through `@/server/services/settings`. Two things stayed
 * here on purpose:
 *
 * 1. `contact` / `site`, as the last-resort constants for `app/error.tsx`. The
 *    root error boundary renders when the layout tree itself has failed, so
 *    there is no SettingsProvider above it and no safe place to await a query.
 *    A stale phone number beats an error page that throws.
 * 2. `paymentMethods`, which pairs a provider with a logo file in `public/`.
 *    Adding one means shipping an asset, so it is a code change either way.
 */

export const site = {
  name: "FlexOver BD",
  legalName: "FlexOver BD",
  tagline: "Everything you need, delivered better.",
  shortDescription: "Your Trusted Online Shopping Destination",
  description:
    "Shop fashion, gadgets, home essentials, beauty and more at FlexOver BD. Fast delivery across Bangladesh, cash on delivery available, and 100% authentic products.",
  url: "https://www.flexoverbd.com",
  logo: "/icon.jpg",
  locale: "en_BD",
  country: "Bangladesh",
  currency: "BDT",
  currencySymbol: "৳",
} as const;

export const contact = {
  whatsapp: "+8801738121614",
  /** E.164 without the leading + — what wa.me expects. */
  whatsappDigits: "8801738121614",
  whatsappUrl:
    "https://wa.me/8801738121614?text=" +
    encodeURIComponent("Hi FlexOver BD! I'd like to know more about an order."),
  phoneDisplay: "+880 1738-121614",
  phoneHref: "tel:+8801738121614",
  email: "support@flexoverbd.com",
  address: "Dhaka, Bangladesh",
  hours: "Sat–Thu, 10:00 AM – 8:00 PM",
} as const;

export type PaymentMethod = {
  /** Looked up as `public/images/payments/<slug>.svg` (any extension works). */
  slug: string;
  name: string;
  /** Rendered in the brand colour until a real logo file is supplied. */
  wordmark: string;
  color: string;
};

/**
 * Visa and Mastercard ship with their real marks. bKash, Nagad and Rocket do
 * not — no openly-licensed asset exists for them, and approximating a
 * trademark by hand would be both legally sloppy and worse-looking than the
 * fallback. Drop the official SVGs from each provider's merchant brand kit
 * into `public/images/payments/` and they replace the wordmarks automatically.
 */
export const paymentMethods: PaymentMethod[] = [
  { slug: "cod", name: "Cash on Delivery", wordmark: "COD", color: "#0e9f6e" },
  { slug: "bkash", name: "bKash", wordmark: "bKash", color: "#e2136e" },
  { slug: "nagad", name: "Nagad", wordmark: "Nagad", color: "#f26522" },
  { slug: "rocket", name: "Rocket", wordmark: "Rocket", color: "#8c3494" },
  { slug: "visa", name: "Visa", wordmark: "VISA", color: "#1a1f71" },
  {
    slug: "mastercard",
    name: "Mastercard",
    wordmark: "Mastercard",
    color: "#eb001b",
  },
];
