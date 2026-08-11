import { Flame, Sparkles, Star, Zap } from "lucide-react";
import type { Metadata } from "next";
import { CategoryGrid } from "@/components/home/category-grid";
import { CategoryScroller } from "@/components/home/category-scroller";
import { FlashSale } from "@/components/home/flash-sale";
import { Hero } from "@/components/home/hero";
import { JoinSection } from "@/components/home/join-section";
import { ProductGrid, ProductRail } from "@/components/home/product-sections";
import { PromoTiles, WideBanner } from "@/components/home/promo-sections";
import { ReviewsSection } from "@/components/home/reviews-section";
import { TrustStrip } from "@/components/home/trust-strip";
import {
  getBestSellers,
  getNewArrivals,
  getProductsByCategory,
  getTopRated,
} from "@/server/services/catalog";
import { HomeJsonLd } from "./json-ld";

export const metadata: Metadata = {
  title: "FlexOver BD — Online Shopping in Bangladesh",
  description:
    "Shop fashion, gadgets, home essentials, beauty and more at FlexOver BD. Fast delivery across all 64 districts, cash on delivery, and 7-day easy returns.",
  alternates: { canonical: "/" },
};

/**
 * Section order is a conversion argument, not a layout preference:
 *
 *  1. Hero — brand plus the current campaign, first thing in view.
 *  2. Category scroller — one tap to self-select a department.
 *  3. Trust strip — answers COD / delivery / returns before the first price.
 *  4. Flash sale — urgency while attention is highest.
 *  ...then browse-oriented blocks, social proof, and finally the capture CTA.
 *
 * Everything here is a Server Component and the page prerenders in full; the
 * only JavaScript that reaches a phone is the hero carousel, the cart, the
 * countdown and the two small form islands.
 */
export default async function HomePage() {
  // One round trip rather than five sequential ones — each is independently
  // cached, so a warm page does no database work at all.
  const [bestSellers, newArrivals, gadgets, beauty, topRated] =
    await Promise.all([
      getBestSellers(8),
      getNewArrivals(10),
      getProductsByCategory("gadgets", 8),
      getProductsByCategory("beauty", 8),
      getTopRated(10),
    ]);

  return (
    <>
      <HomeJsonLd />

      {/* Visible headings belong to individual sections, so the page-level h1
          exists for assistive tech and search engines. */}
      <h1 className="sr-only">
        FlexOver BD — online shopping in Bangladesh for fashion, gadgets, home
        essentials and beauty
      </h1>

      <div className="space-y-8 pb-10 sm:space-y-12 sm:pb-14">
        <Hero />
        <CategoryScroller />
        <TrustStrip />
        <FlashSale />

        <ProductGrid
          id="best-sellers"
          eyebrow="Most loved"
          icon={Flame}
          title="Best sellers this week"
          subtitle="What everyone in Bangladesh is buying right now"
          href="/best-sellers"
          products={bestSellers}
        />

        <PromoTiles />
        <CategoryGrid />

        <ProductRail
          id="new-arrivals"
          eyebrow="Just landed"
          icon={Sparkles}
          title="New arrivals"
          subtitle="Fresh stock added this week"
          href="/new-arrivals"
          products={newArrivals}
        />

        <WideBanner />

        <ProductGrid
          id="gadgets"
          eyebrow="Trending"
          icon={Zap}
          title="Gadgets worth the upgrade"
          subtitle="Audio, wearables and charging — all with warranty"
          href="/category/gadgets"
          products={gadgets}
        />

        <ProductRail
          id="beauty"
          eyebrow="Self care"
          icon={Sparkles}
          title="Beauty & care picks"
          subtitle="Authentic skincare, haircare and fragrance"
          href="/category/beauty"
          products={beauty}
        />

        <ProductRail
          id="top-rated"
          eyebrow="Highest rated"
          icon={Star}
          title="Rated 4.5 and above"
          subtitle="Products our customers keep coming back for"
          href="/top-rated"
          products={topRated}
        />

        <ReviewsSection />
        <JoinSection />
      </div>
    </>
  );
}
