import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { getProducts } from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "Your Wishlist",
  description: "Products you've saved at FlexOver BD.",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  // Saved ids live in the browser; the catalogue they resolve against is the
  // database.
  const products = await getProducts();

  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
      />
      <h1 className="mb-1 text-2xl font-extrabold text-ink sm:text-3xl">
        Your wishlist
      </h1>
      <p className="mb-5 text-sm text-ink-2">
        Saved on this device so you can come back to them.
      </p>
      {/* The saved list is ids only, so the catalogue is resolved server-side
          and handed down. */}
      <WishlistView catalogue={products} />
    </div>
  );
}
