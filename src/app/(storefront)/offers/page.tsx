import { Percent } from "lucide-react";
import type { Metadata } from "next";
import { CountdownTimer } from "@/components/home/countdown-timer";
import { ListingPage } from "@/components/listing/listing-page";
import { effectivePrice } from "@/lib/listing";
import { discountPercent } from "@/lib/utils";
import { getDiscountedProducts } from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "Today's Offers — Deals & Discounts",
  description:
    "Every discounted product at FlexOver BD in one place. Flash sale prices, cash on delivery and fast delivery across Bangladesh.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage(props: PageProps<"/offers">) {
  // The candidates come from SQL — only a product with a compareAt above its
  // price, or one in a running flash sale, can be discounted at all. The
  // percent itself is derived rather than stored, so the ranking stays here.
  const discounted = (await getDiscountedProducts())
    .filter((p) => discountPercent(effectivePrice(p), p.compareAt) > 0)
    .sort(
      (a, b) =>
        discountPercent(effectivePrice(b), b.compareAt) -
        discountPercent(effectivePrice(a), a.compareAt),
    );

  return (
    <ListingPage
      pathname="/offers"
      searchParams={props.searchParams}
      products={discounted}
      eyebrow="Save today"
      icon={Percent}
      title="Today's Offers"
      subtitle={`${discounted.length} products on discount right now, with cash on delivery available nationwide.`}
      emptyMessage="No offers match these filters. Try clearing the price range."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-linear-to-r from-brand-500 to-brand-600 p-4 sm:p-5">
        <div>
          <p className="text-base font-extrabold text-white sm:text-lg">
            Flash prices end at midnight
          </p>
          <p className="text-xs text-white/85 sm:text-sm">
            Stock is limited — deals refresh every morning.
          </p>
        </div>
        <CountdownTimer />
      </div>
    </ListingPage>
  );
}
