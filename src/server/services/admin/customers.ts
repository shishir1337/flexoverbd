import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Customers, keyed by phone number rather than by user account.
 *
 * Checkout is guest-first and payment is cash on delivery, so most orders carry
 * no `userId` at all — a customer list built from the `user` table would show a
 * handful of people who happened to register and miss almost everyone who has
 * ever bought something. The mobile number is the identity that actually
 * persists across a guest's repeat orders, which is why `customerPhone` is
 * snapshotted onto every order.
 *
 * The figures that matter for a COD store are lifetime *delivered* value and
 * the cancellation rate: a customer who places five orders and refuses four at
 * the door costs money on every one, and nothing else in the admin surfaces
 * that.
 */

export type CustomerRow = {
  phone: string;
  name: string;
  email: string | null;
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  lifetimeValue: number;
  lastOrderAt: string;
  hasAccount: boolean;
};

const PAGE_SIZE = 30;

export type CustomerFilters = {
  q?: string;
  page?: number;
  /** "value" ranks by money actually collected; "recent" by last order. */
  sort?: "recent" | "value" | "orders";
};

export async function listCustomers(filters: CustomerFilters = {}): Promise<{
  customers: CustomerRow[];
  total: number;
  pageCount: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const q = filters.q?.trim() ?? "";

  const where = q
    ? {
        OR: [
          { customerPhone: { contains: q } },
          { customerName: { contains: q, mode: "insensitive" as const } },
          { customerEmail: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Grouped in the database rather than pulling every order into memory: a
  // store with a year of history has tens of thousands of them.
  const groups = await prisma.order.groupBy({
    by: ["customerPhone"],
    where,
    _count: { _all: true },
    _max: { placedAt: true },
  });

  const total = groups.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sorted = [...groups].sort((a, b) => {
    if (filters.sort === "orders") return b._count._all - a._count._all;
    // "value" needs the per-customer totals below, so it falls through to
    // recency here and is re-sorted once those are known.
    return (
      (b._max.placedAt?.getTime() ?? 0) - (a._max.placedAt?.getTime() ?? 0)
    );
  });

  const phones = sorted
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((g) => g.customerPhone);

  if (phones.length === 0) return { customers: [], total, pageCount };

  const [orders, accounts] = await Promise.all([
    prisma.order.findMany({
      where: { customerPhone: { in: phones } },
      select: {
        customerPhone: true,
        customerName: true,
        customerEmail: true,
        status: true,
        total: true,
        placedAt: true,
        userId: true,
      },
      orderBy: { placedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { phone: { in: phones } },
      select: { phone: true },
    }),
  ]);

  const registered = new Set(accounts.map((a) => a.phone));
  const byPhone = new Map<string, CustomerRow>();

  for (const o of orders) {
    const existing = byPhone.get(o.customerPhone);
    const row: CustomerRow = existing ?? {
      phone: o.customerPhone,
      // Orders come back newest first, so the first name seen is the most
      // recent one they gave — the one worth showing.
      name: o.customerName,
      email: o.customerEmail,
      orderCount: 0,
      deliveredCount: 0,
      cancelledCount: 0,
      lifetimeValue: 0,
      lastOrderAt: o.placedAt.toISOString(),
      hasAccount: registered.has(o.customerPhone) || o.userId !== null,
    };

    row.orderCount += 1;
    if (o.status === "DELIVERED") {
      row.deliveredCount += 1;
      // Only delivered orders count: on COD, a cancelled order is money that
      // never arrived, and counting it would flatter every figure here.
      row.lifetimeValue += o.total;
    }
    if (o.status === "CANCELLED" || o.status === "RETURNED") {
      row.cancelledCount += 1;
    }
    row.email ??= o.customerEmail;
    if (o.userId) row.hasAccount = true;

    byPhone.set(o.customerPhone, row);
  }

  let customers = phones
    .map((p) => byPhone.get(p))
    .filter((r): r is CustomerRow => Boolean(r));

  if (filters.sort === "value") {
    customers = customers.sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }

  return { customers, total, pageCount };
}

export type CustomerDetail = {
  phone: string;
  name: string;
  email: string | null;
  hasAccount: boolean;
  accountEmail: string | null;
  joinedAt: string | null;
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  lifetimeValue: number;
  addresses: string[];
  orders: {
    id: string;
    number: string;
    status: string;
    total: number;
    placedAt: string;
    itemCount: number;
  }[];
};

export async function getCustomer(
  phone: string,
): Promise<CustomerDetail | null> {
  const orders = await prisma.order.findMany({
    where: { customerPhone: phone },
    orderBy: { placedAt: "desc" },
    include: {
      district: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  if (orders.length === 0) return null;

  // Two ways a phone number can map to an account: the user set it on their
  // profile, or one of these orders was placed while signed in.
  const linkedUserId = orders.find((o) => o.userId)?.userId;
  const account = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, ...(linkedUserId ? [{ id: linkedUserId }] : [])],
    },
    select: { email: true, createdAt: true },
  });

  const latest = orders[0];

  return {
    phone,
    name: latest.customerName,
    email: orders.find((o) => o.customerEmail)?.customerEmail ?? null,
    hasAccount: Boolean(account),
    accountEmail: account?.email ?? null,
    joinedAt: account?.createdAt.toISOString() ?? null,
    orderCount: orders.length,
    deliveredCount: orders.filter((o) => o.status === "DELIVERED").length,
    cancelledCount: orders.filter(
      (o) => o.status === "CANCELLED" || o.status === "RETURNED",
    ).length,
    lifetimeValue: orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((n, o) => n + o.total, 0),
    // Deduplicated: repeat customers usually reuse one address, and listing it
    // five times tells nobody anything.
    addresses: [
      ...new Set(
        orders.map((o) =>
          [o.line1, o.area, o.district.name].filter(Boolean).join(", "),
        ),
      ),
    ],
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: o.total,
      placedAt: o.placedAt.toISOString(),
      itemCount: o._count.items,
    })),
  };
}
