import "server-only";
import { prisma } from "@/lib/prisma";
import { getCommerceSettings } from "@/server/services/settings";

/**
 * The dashboard's numbers.
 *
 * Three of these are deliberately *not* the obvious query, because the obvious
 * query is wrong for a cash-on-delivery store:
 *
 *  - **Revenue means collected.** COD money only exists once a rider has handed
 *    it over. Counting every order that has not been cancelled reports cash
 *    that is still sitting in someone's bag, or that will be refused at the
 *    door — which for a store like this is a meaningful fraction.
 *  - **Customers means people, not accounts.** Checkout is guest-first, so
 *    counting `user` rows with the customer role reports approximately zero
 *    forever. The identity that persists across a guest's repeat orders is
 *    their mobile number, which is what the Customers screen groups by.
 *  - **Low stock uses the configured threshold**, not a number baked in here.
 *    There is a setting for it and it should mean something.
 */

export type WorkItem = {
  key: string;
  label: string;
  /** What doing nothing costs — shown under the count. */
  hint: string;
  count: number;
  href: string;
  tone: "urgent" | "warn" | "neutral";
};

export type DashboardData = {
  work: WorkItem[];
  /** Cash actually collected, and cash still out with riders. */
  collectedToday: number;
  collected7d: number;
  awaitingCollection: number;
  ordersToday: number;
  ordersYesterday: number;
  customerCount: number;
  productCount: number;
  recentOrders: {
    number: string;
    customerName: string;
    total: number;
    status: string;
    placedAt: string;
  }[];
  lowStock: {
    variantId: string;
    productId: string;
    title: string;
    variantLabel: string;
    stock: number;
  }[];
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboard(): Promise<DashboardData> {
  const commerce = await getCommerceSettings();

  const today = startOfToday();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);

  const [
    toConfirm,
    toPack,
    toShip,
    inTransit,
    pendingReviews,
    screenshotsAwaitingConsent,
    outOfStock,
    lowStockCount,
    collectedTodayAgg,
    collected7dAgg,
    awaitingAgg,
    ordersToday,
    ordersYesterday,
    customerGroups,
    productCount,
    recent,
    lowStockRows,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
    prisma.order.count({ where: { status: "PACKED" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.reviewScreenshot.count({ where: { consentObtained: false } }),
    prisma.productVariant.count({
      where: { isActive: true, stock: { lte: 0 } },
    }),
    prisma.productVariant.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: commerce.lowStockThreshold },
      },
    }),

    // Delivered *today* — `deliveredAt`, not `placedAt`: an order placed last
    // week and collected this morning is today's money.
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: "DELIVERED", deliveredAt: { gte: today } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: "DELIVERED", deliveredAt: { gte: weekAgo } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["CONFIRMED", "PACKED", "SHIPPED"] } },
    }),

    prisma.order.count({ where: { placedAt: { gte: today } } }),
    prisma.order.count({
      where: { placedAt: { gte: yesterday, lt: today } },
    }),

    prisma.order.groupBy({ by: ["customerPhone"] }),
    prisma.product.count({ where: { archivedAt: null } }),

    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      select: {
        number: true,
        customerName: true,
        total: true,
        status: true,
        placedAt: true,
      },
    }),

    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: commerce.lowStockThreshold } },
      orderBy: { stock: "asc" },
      take: 6,
      select: {
        id: true,
        stock: true,
        colourName: true,
        sizeValue: true,
        product: { select: { id: true, title: true, archivedAt: true } },
      },
    }),
  ]);

  const work: WorkItem[] = [
    {
      key: "confirm",
      label: "Awaiting confirmation",
      hint: "Call to confirm before packing",
      count: toConfirm,
      href: "/admin/orders?status=PLACED",
      tone: "urgent",
    },
    {
      key: "pack",
      label: "Ready to pack",
      hint: "Confirmed and waiting",
      count: toPack,
      href: "/admin/orders?status=CONFIRMED",
      tone: "warn",
    },
    {
      key: "ship",
      label: "Ready to hand over",
      hint: "Packed, waiting for the courier",
      count: toShip,
      href: "/admin/orders?status=PACKED",
      tone: "warn",
    },
    {
      key: "transit",
      label: "Out for delivery",
      hint: "With the courier now",
      count: inTransit,
      href: "/admin/orders?status=SHIPPED",
      tone: "neutral",
    },
    {
      key: "oos",
      label: "Out of stock",
      hint: "Live on the site with nothing to sell",
      count: outOfStock,
      href: "/admin/products?stock=out",
      tone: "urgent",
    },
    {
      key: "low",
      label: "Low stock",
      hint: `At or under ${commerce.lowStockThreshold} left`,
      count: lowStockCount,
      href: "/admin/products?stock=low",
      tone: "warn",
    },
    {
      key: "reviews",
      label: "Reviews to moderate",
      hint: "Not visible until published",
      count: pendingReviews,
      href: "/admin/content/reviews",
      tone: "neutral",
    },
    {
      key: "consent",
      label: "Screenshots without consent",
      hint: "Cannot be published until recorded",
      count: screenshotsAwaitingConsent,
      href: "/admin/content/screenshots",
      tone: "neutral",
    },
  ];

  return {
    // Only what actually needs doing. A queue of zeroes is noise, and the
    // point of this screen is that an empty one means an empty day's work.
    work: work.filter((w) => w.count > 0),
    collectedToday: collectedTodayAgg._sum.total ?? 0,
    collected7d: collected7dAgg._sum.total ?? 0,
    awaitingCollection: awaitingAgg._sum.total ?? 0,
    ordersToday,
    ordersYesterday,
    customerCount: customerGroups.length,
    productCount,
    recentOrders: recent.map((o) => ({
      number: o.number,
      customerName: o.customerName,
      total: o.total,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
    })),
    lowStock: lowStockRows
      // Archived products still have variants; they are not worth restocking.
      .filter((v) => v.product.archivedAt === null)
      .map((v) => ({
        variantId: v.id,
        productId: v.product.id,
        title: v.product.title,
        variantLabel:
          [v.colourName, v.sizeValue].filter(Boolean).join(" · ") || "Default",
        stock: v.stock,
      })),
  };
}

/**
 * The two counts the sidebar badges.
 *
 * Split from `getDashboard` because the layout renders on every admin page and
 * must not pay for the whole dashboard to draw two numbers.
 */
export async function getNavBadges(): Promise<{
  orders: number;
  reviews: number;
}> {
  const [orders, reviews] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.review.count({ where: { isApproved: false } }),
  ]);
  return { orders, reviews };
}
