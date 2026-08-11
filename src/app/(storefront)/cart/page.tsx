import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your FlexOver BD cart before checkout.",
  // A personal, per-device page — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Cart" }]}
      />
      <h1 className="mb-5 text-2xl font-extrabold text-ink sm:text-3xl">
        Your cart
      </h1>
      <CartView />
    </div>
  );
}
