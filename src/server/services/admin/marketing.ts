import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Admin reads for coupons, flash sales and the newsletter list.
 */

export type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  /** Money actually given away, from the redemption ledger. */
  redeemedValue: number;
};

export async function listCoupons(): Promise<CouponRow[]> {
  const [coupons, totals] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.couponRedemption.groupBy({
      by: ["couponId"],
      _sum: { amount: true },
    }),
  ]);

  const redeemed = new Map(totals.map((t) => [t.couponId, t._sum.amount ?? 0]));

  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    perUserLimit: c.perUserLimit,
    usedCount: c.usedCount,
    startsAt: c.startsAt?.toISOString().slice(0, 10) ?? "",
    endsAt: c.endsAt?.toISOString().slice(0, 10) ?? "",
    isActive: c.isActive,
    redeemedValue: redeemed.get(c.id) ?? 0,
  }));
}

export type FlashSaleRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  itemCount: number;
  /** True when it is running right now, which is what the rail keys off. */
  isLive: boolean;
};

export async function listFlashSales(): Promise<FlashSaleRow[]> {
  const now = new Date();
  const rows = await prisma.flashSaleCampaign.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    startsAt: c.startsAt.toISOString().slice(0, 16),
    endsAt: c.endsAt.toISOString().slice(0, 16),
    isActive: c.isActive,
    itemCount: c._count.items,
    isLive: c.isActive && c.startsAt <= now && c.endsAt >= now,
  }));
}

export type SubscriberStats = {
  total: number;
  subscribed: number;
  recent: { email: string; source: string | null; createdAt: string }[];
};

export async function getSubscribers(): Promise<SubscriberStats> {
  const [total, subscribed, recent] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { email: true, source: true, createdAt: true },
    }),
  ]);

  return {
    total,
    subscribed,
    recent: recent.map((r) => ({
      email: r.email,
      source: r.source,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    })),
  };
}
