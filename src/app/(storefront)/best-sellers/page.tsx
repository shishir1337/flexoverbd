import { Flame } from "lucide-react";
import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getBestSellers } from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "Best Sellers",
  description:
    "The products customers across Bangladesh buy most from FlexOver BD, ranked by units sold.",
  alternates: { canonical: "/best-sellers" },
};

export default async function BestSellersPage(
  props: PageProps<"/best-sellers">,
) {
  return (
    <ListingPage
      pathname="/best-sellers"
      searchParams={props.searchParams}
      products={await getBestSellers(60)}
      eyebrow="Most loved"
      icon={Flame}
      title="Best sellers"
      subtitle="Ranked by how many our customers have actually bought — not by what we want to shift."
    />
  );
}
