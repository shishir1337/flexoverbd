import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Admin order reads.
 *
 * Uncached throughout: this is an operational queue. Two staff members working
 * the same list must not see different versions of it, and a cached "Placed"
 * on an order a colleague just confirmed causes duplicate phone calls.
 */

// Status vocabulary lives in @/lib/order-status so the admin's Client
// Component buttons can share it — this module is server-only.
export {
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  RESTOCKING_STATUSES,
  STATUS_LABEL,
} from "@/lib/order-status";

export type OrderFilters = {
  status?: OrderStatus;
  q?: string;
  page?: number;
  /** Rolling window from today, in days. Undefined means all time. */
  days?: number;
  /**
   * Everything still in flight, as one filter. This is the default view —
   * see the note on `buildWhere`.
   */
  active?: boolean;
  /** Delivery zone, because couriers are assigned by zone. */
  zoneId?: string;
  sort?: OrderSort;
};

/**
 * Sort orders.
 *
 * `newest` is the default because the queue is worked front to back. `oldest`
 * matters more than it sounds: the order that has been waiting longest is the
 * one whose customer is about to ring, and newest-first buries it.
 */
export type OrderSort = "newest" | "oldest" | "highest" | "lowest";

const ORDER_BY: Record<OrderSort, Prisma.OrderOrderByWithRelationInput> = {
  newest: { placedAt: "desc" },
  oldest: { placedAt: "asc" },
  highest: { total: "desc" },
  lowest: { total: "asc" },
};

const PAGE_SIZE = 20;

/**
 * One place that turns filters into a query, used by both the list and the
 * export — an export that quietly disagreed with the list it was taken from
 * would be worse than no export.
 */
function buildWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  } else if (filters.active) {
    // The default. Opening the queue should show the work, not the archive —
    // on a store with a year of history, "All" buries eight orders that need
    // a phone call under nine hundred that are finished.
    where.status = { in: ["PLACED", "CONFIRMED", "PACKED", "SHIPPED"] };
  }

  if (filters.zoneId) where.district = { zoneId: filters.zoneId };

  if (filters.days) {
    // From midnight, not from "now minus N days" — staff mean calendar days,
    // and a 24-hour window silently drops this morning's orders at lunchtime.
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (filters.days - 1));
    where.placedAt = { gte: from };
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q.replace(/\D/g, "") || q } },
    ];
  }

  return where;
}

export async function listOrders(filters: OrderFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);

  const where = buildWhere(filters);
  const orderBy = ORDER_BY[filters.sort ?? "newest"];

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        district: true,
        _count: { select: { items: true } },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);

  /**
   * Which of these customers have a history of refusing parcels.
   *
   * One grouped query over the phone numbers on this page rather than a lookup
   * per row — the list is twenty orders, but the per-row version is the shape
   * that quietly becomes twenty queries.
   */
  const phones = [...new Set(orders.map((o) => o.customerPhone))];
  const priors = phones.length
    ? await prisma.order.groupBy({
        by: ["customerPhone", "status"],
        where: { customerPhone: { in: phones } },
        _count: { _all: true },
      })
    : [];

  const riskByPhone = new Map<string, boolean>();
  for (const phone of phones) {
    const mine = priors.filter((p) => p.customerPhone === phone);
    const delivered =
      mine.find((p) => p.status === "DELIVERED")?._count._all ?? 0;
    const refused = mine
      .filter((p) => p.status === "CANCELLED" || p.status === "RETURNED")
      .reduce((n, p) => n + p._count._all, 0);
    riskByPhone.set(phone, refused >= 2 && refused >= delivered);
  }

  return {
    orders: orders.map((o) => ({
      ...o,
      customerIsRisky: riskByPhone.get(o.customerPhone) ?? false,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    countsByStatus: Object.fromEntries(
      counts.map((c) => [c.status, c._count]),
    ) as Partial<Record<OrderStatus, number>>,
  };
}

export async function getAdminOrder(number: string) {
  return prisma.order.findUnique({
    where: { number },
    include: {
      district: { include: { zone: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { slug: true } },
          // Live stock for the exact variant, so an item that sold out after
          // this order was placed is flagged before someone walks to the shelf.
          variant: { select: { stock: true } },
        },
      },
      // Admins see internal notes too, unlike the customer-facing timeline.
      events: { orderBy: { createdAt: "asc" } },
      coupon: true,
    },
  });
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/**
 * Every order matching the current filters, for the CSV export.
 *
 * Deliberately not paginated — the point of an export is that it is complete,
 * and a file that silently stopped at the first twenty rows would be worse
 * than no export at all. Capped all the same, because an unbounded query on a
 * year of orders is a way to take the admin down.
 */
export async function exportOrders(filters: OrderFilters = {}) {
  return prisma.order.findMany({
    where: buildWhere(filters),
    include: {
      district: { select: { name: true } },
      items: {
        orderBy: { id: "asc" },
        select: { titleSnapshot: true, variantLabel: true, qty: true },
      },
    },
    orderBy: ORDER_BY[filters.sort ?? "newest"],
    take: 5000,
  });
}

export type CustomerHistory = {
  totalOrders: number;
  delivered: number;
  cancelled: number;
  /** Sum of delivered orders — what this customer has actually been worth. */
  lifetimeValue: number;
  /** Flagged when refusals outweigh deliveries and there are enough to judge. */
  isRisky: boolean;
};

/**
 * What this phone number has done before, for the order being looked at.
 *
 * Shown on the order page because that is where the dispatch decision is made.
 * On cash on delivery a refused parcel costs the courier fee in both
 * directions and comes back needing repackaging, so a customer who has refused
 * three of their last four is worth a confirmation call before another one
 * goes out — and nobody is going to open a separate screen to find that out.
 *
 * `excludeOrderId` keeps the order in front of you out of its own statistics.
 */
export async function getCustomerHistory(
  phone: string,
  excludeOrderId: string,
): Promise<CustomerHistory> {
  const rows = await prisma.order.findMany({
    where: { customerPhone: phone, id: { not: excludeOrderId } },
    select: { status: true, total: true },
  });

  const delivered = rows.filter((o) => o.status === "DELIVERED");
  const cancelled = rows.filter(
    (o) => o.status === "CANCELLED" || o.status === "RETURNED",
  );

  return {
    totalOrders: rows.length,
    delivered: delivered.length,
    cancelled: cancelled.length,
    lifetimeValue: delivered.reduce((n, o) => n + o.total, 0),
    // Two is the floor: one refusal is a bad day, not a pattern.
    isRisky: cancelled.length >= 2 && cancelled.length >= delivered.length,
  };
}
