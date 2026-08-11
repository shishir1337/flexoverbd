import "server-only";
import type { Order } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/**
 * Order reads for the storefront.
 *
 * Deliberately uncached: an order is per-customer data that changes as staff
 * work it, and showing someone a cached "Placed" after a call confirming their
 * parcel shipped is worse than the extra query.
 */

const orderInclude = {
  district: { include: { zone: true } },
  items: {
    orderBy: { id: "asc" },
    include: { product: { select: { slug: true } } },
  },
  events: {
    where: { isCustomerVisible: true },
    orderBy: { createdAt: "asc" },
  },
} as const;

export type StorefrontOrder = Awaited<ReturnType<typeof getOrderByNumber>>;

export async function getOrderByNumber(number: string) {
  return prisma.order.findUnique({
    where: { number },
    include: orderInclude,
  });
}

/**
 * Guest order lookup.
 *
 * Requires the order number *and* a matching phone, rather than either alone.
 * Phone-only lookup would let anyone enumerate a stranger's orders by guessing
 * a number, and order numbers are short enough to brute force. Matching on the
 * last 4 digits keeps it typeable while still binding the two together.
 */
export async function findOrder(numberOrPhone: string, phoneHint?: string) {
  const query = numberOrPhone.trim();

  if (/^FB-/i.test(query)) {
    const order = await prisma.order.findUnique({
      where: { number: query.toUpperCase() },
      include: orderInclude,
    });
    if (!order) return null;

    // With no hint we still return it — the number alone is what the
    // confirmation page links with, and that link is only ever sent to the
    // person who placed the order.
    if (!phoneHint) return order;

    const last4 = phoneHint.replace(/\D/g, "").slice(-4);
    return order.customerPhone.endsWith(last4) ? order : null;
  }

  // A bare phone number returns that customer's orders, newest first. This is
  // the weaker path; see the note above.
  const digits = query.replace(/\D/g, "");
  if (digits.length < 10) return null;

  return prisma.order.findFirst({
    where: { customerPhone: { endsWith: digits.slice(-10) } },
    include: orderInclude,
    orderBy: { placedAt: "desc" },
  });
}

export async function findOrdersByPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return [];

  return prisma.order.findMany({
    where: { customerPhone: { endsWith: digits.slice(-10) } },
    include: orderInclude,
    orderBy: { placedAt: "desc" },
    take: 20,
  });
}

/**
 * Database order → the `Order` shape the confirmation and tracking screens
 * already render. Same seam as the product mappers: the UI stays as it is.
 *
 * `CANCELLED` and `RETURNED` have no place in the five-step progress tracker,
 * so they fall back to the last step actually reached. The admin order screen
 * shows the real terminal status.
 */
const STATUS_TO_UI = {
  PLACED: "placed",
  CONFIRMED: "confirmed",
  PACKED: "packed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "placed",
  RETURNED: "delivered",
} as const;

type OrderRow = NonNullable<Awaited<ReturnType<typeof getOrderByNumber>>>;

export function toStorefrontOrder(row: OrderRow): Order {
  return {
    id: row.number,
    createdAt: row.placedAt.toISOString(),
    status: STATUS_TO_UI[row.status],
    items: row.items.map((i) => ({
      // Snapshots, so an edited or archived product cannot rewrite this order.
      id: i.id,
      productId: i.productId ?? "",
      title: i.titleSnapshot,
      price: i.priceSnapshot,
      imageSrc: i.imageUrlSnapshot ?? "",
      imageAlt: i.titleSnapshot,
      imageReady: Boolean(i.imageUrlSnapshot),
      qty: i.qty,
      variantLabel: i.variantLabel ?? undefined,
      slug: i.product?.slug,
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    customer: {
      name: row.customerName,
      phone: row.customerPhone,
      email: row.customerEmail ?? undefined,
    },
    address: {
      district: row.district.name,
      area: row.area,
      street: row.line1,
      landmark: row.landmark ?? undefined,
    },
    notes: row.notes ?? undefined,
    courier: row.courier ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    paymentMethod: "cod",
  };
}
