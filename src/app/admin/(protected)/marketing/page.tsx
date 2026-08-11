import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import {
  getSubscribers,
  listCoupons,
  listFlashSales,
} from "@/server/services/admin/marketing";
import { CouponManager } from "./coupon-manager";
import { FlashManager } from "./flash-manager";
import { SubscriberList } from "./subscriber-list";

export const instant = false;
export const metadata: Metadata = { title: "Marketing" };

export default async function AdminMarketingPage() {
  await connection();
  await requirePermission({ marketing: ["read"] });

  const [coupons, campaigns, subscribers] = await Promise.all([
    listCoupons(),
    listFlashSales(),
    getSubscribers(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Marketing"
        subtitle="Discount codes, flash sale windows and the mailing list."
      />

      <div className="mt-5 space-y-5">
        <CouponManager coupons={coupons} />
        <FlashManager campaigns={campaigns} />
        <SubscriberList stats={subscribers} />
      </div>
    </div>
  );
}
