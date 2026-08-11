import { Star } from "lucide-react";
import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getTopRated } from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "Top Rated Products",
  description:
    "Products rated 4.5 and above by verified FlexOver BD buyers, with cash on delivery across Bangladesh.",
  alternates: { canonical: "/top-rated" },
};

export default async function TopRatedPage(props: PageProps<"/top-rated">) {
  // Filtering and ordering moved into SQL — see getTopRated().
  const topRated = await getTopRated(60);

  return (
    <ListingPage
      pathname="/top-rated"
      searchParams={props.searchParams}
      products={topRated}
      eyebrow="Highest rated"
      icon={Star}
      title="Rated 4.5 and above"
      subtitle={`${topRated.length} products our customers keep coming back for, ranked by rating then review count.`}
    />
  );
}
