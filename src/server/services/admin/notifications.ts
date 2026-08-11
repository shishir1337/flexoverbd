import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * What the notification bell shows.
 *
 * Not a feed of everything that has happened — a list of things that still need
 * a person. An order confirmed an hour ago is history; an order sitting
 * unconfirmed is a phone call nobody has made yet. So each entry is derived
 * from current state rather than from an event log, which also means it clears
 * itself when the work is done rather than needing a "mark as read" ritual.
 *
 * Low stock is deliberately absent: it is a planning concern, not an interrupt,
 * and it already has a home on the dashboard. Out of stock *is* here, because a
 * product live on the site with nothing to sell is losing orders right now.
 */

export type AdminNotification = {
  id: string;
  kind: "order" | "review" | "stock" | "consent";
  title: string;
  detail: string;
  href: string;
  /** ISO string, for relative time. Absent for aggregate rows. */
  at?: string;
  urgent: boolean;
};

export type NotificationFeed = {
  items: AdminNotification[];
  count: number;
  /**
   * Newest order timestamp in the feed. The client compares this between polls
   * to decide whether anything actually arrived — a count alone cannot tell
   * "one new order" from "one confirmed and one placed".
   */
  latestOrderAt: string | null;
};

export async function getNotifications(): Promise<NotificationFeed> {
  const [placed, pendingReviews, outOfStock, unconsented] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PLACED" },
      orderBy: { placedAt: "desc" },
      take: 8,
      select: {
        number: true,
        customerName: true,
        total: true,
        placedAt: true,
      },
    }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.productVariant.count({
      where: { isActive: true, stock: { lte: 0 } },
    }),
    prisma.reviewScreenshot.count({ where: { consentObtained: false } }),
  ]);

  const items: AdminNotification[] = placed.map((o) => ({
    id: `order-${o.number}`,
    kind: "order",
    title: `New order from ${o.customerName}`,
    detail: `${o.number} · ৳${o.total.toLocaleString("en-BD")} · needs confirming`,
    href: `/admin/orders/${o.number}`,
    at: o.placedAt.toISOString(),
    urgent: true,
  }));

  // Aggregates rather than one row each: forty out-of-stock variants would
  // bury the orders, and the useful action is "go and look at the list".
  if (outOfStock > 0) {
    items.push({
      id: "stock-out",
      kind: "stock",
      title: `${outOfStock} ${outOfStock === 1 ? "variant is" : "variants are"} out of stock`,
      detail: "Live on the site with nothing to sell",
      href: "/admin/products?stock=out",
      urgent: true,
    });
  }

  if (pendingReviews > 0) {
    items.push({
      id: "reviews-pending",
      kind: "review",
      title: `${pendingReviews} ${pendingReviews === 1 ? "review" : "reviews"} to moderate`,
      detail: "Not visible on the site until published",
      href: "/admin/content/reviews",
      urgent: false,
    });
  }

  if (unconsented > 0) {
    items.push({
      id: "consent-pending",
      kind: "consent",
      title: `${unconsented} ${unconsented === 1 ? "screenshot" : "screenshots"} without consent`,
      detail: "Cannot be published until recorded",
      href: "/admin/content/screenshots",
      urgent: false,
    });
  }

  return {
    items,
    count: items.length,
    latestOrderAt: placed[0]?.placedAt.toISOString() ?? null,
  };
}
