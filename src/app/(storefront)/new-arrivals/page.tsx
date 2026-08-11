import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ListingPage } from "@/components/listing/listing-page";
import { getNewArrivals } from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "New Arrivals",
  description:
    "The latest additions to the FlexOver BD catalogue across fashion, gadgets, home, beauty and more.",
  alternates: { canonical: "/new-arrivals" },
};

export default async function NewArrivalsPage(
  props: PageProps<"/new-arrivals">,
) {
  return (
    <ListingPage
      pathname="/new-arrivals"
      searchParams={props.searchParams}
      products={await getNewArrivals(60)}
      eyebrow="Just landed"
      icon={Sparkles}
      title="New arrivals"
      subtitle="Fresh stock, newest first. Everything here landed in the last few weeks."
    />
  );
}
