import type { Review } from "./types";

/**
 * Demo testimonials.
 *
 * Deliberately no avatar photographs. A stock portrait of a real person
 * attached to a quote they never said is a misrepresentation the moment this
 * site goes live, and demo content has a habit of surviving to production —
 * so these render as initials instead. When FlexOver has genuine reviews with
 * genuine consent, adding photos back is a small change to `ReviewsSection`.
 */

export const reviews: Review[] = [
  {
    id: "r-1",
    name: "Nusrat Jahan",
    location: "Dhanmondi, Dhaka",
    rating: 5,
    date: "2 weeks ago",
    body: "Ordered the dress on Sunday night and it reached me on Tuesday morning. Fabric is exactly like the photo — soft, not see-through. Paid cash to the delivery man, no hassle at all.",
    productBought: "Summer Floral Dress",
    verified: true,
  },
  {
    id: "r-2",
    name: "Tanvir Ahmed",
    location: "Agrabad, Chattogram",
    rating: 5,
    date: "1 month ago",
    body: "Was honestly nervous buying earbuds online. But these are original, the sound is clean on the bus, and the case easily lasts my whole day. Delivery to Chattogram took 3 days.",
    productBought: "True Wireless Earbuds with Charging Case",
    verified: true,
  },
  {
    id: "r-3",
    name: "Farhana Rahman",
    location: "Zindabazar, Sylhet",
    rating: 4,
    date: "3 weeks ago",
    body: "The wok is genuinely heavy and good quality, nothing sticks to it. It arrived with a small scratch on the handle, I messaged on WhatsApp and they replaced it within a week. Good service.",
    productBought: "Carbon Steel Wok 32cm",
    verified: true,
  },
  {
    id: "r-4",
    name: "Sabbir Hossain",
    location: "Uttara, Dhaka",
    rating: 5,
    date: "5 days ago",
    body: "Third order from FlexOver now. Prices are better than the shops in the market and I don't have to leave home. The backpack is sturdy and the inside compartment fits my laptop properly.",
    productBought: "Faux Leather Backpack",
    verified: true,
  },
  {
    id: "r-5",
    name: "Maliha Chowdhury",
    location: "Kotwali, Rajshahi",
    rating: 5,
    date: "2 months ago",
    body: "The shades in this palette are pigmented and blend easily, nothing chalky. Sealed box, proper batch code printed on the back. Already ordered a second one for my sister.",
    productBought: "Eyeshadow Palette with Mirror",
    verified: true,
  },
  {
    id: "r-6",
    name: "Rakibul Islam",
    location: "Khulna Sadar, Khulna",
    rating: 4,
    date: "1 week ago",
    body: "Bought the watch for my father. The leather strap is soft and the finish looks far more expensive than the price. Delivery charge outside Dhaka is fair and they called before coming.",
    productBought: "Brown Leather Strap Watch",
    verified: true,
  },
];

/** Aggregate figures used in the trust bar and JSON-LD. */
export const storeStats = {
  ratingAverage: 4.8,
  ratingCount: 12480,
  ordersDelivered: 96000,
  happyCustomers: 42000,
  districtsCovered: 64,
} as const;
