import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getDefaultAddress } from "@/server/services/address-actions";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your FlexOver BD order with cash on delivery.",
  robots: { index: false, follow: false },
};

/**
 * The saved address is per-customer, so it sits behind its own boundary and the
 * heading above it still prerenders. The form renders with empty fields either
 * way — prefill is a convenience layered on afterwards, never something the
 * page waits for.
 */
async function Form() {
  return <CheckoutForm saved={await getDefaultAddress()} />;
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Home", href: "/" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />
      <h1 className="mb-1 text-2xl font-extrabold text-ink sm:text-3xl">
        Checkout
      </h1>
      <p className="mb-5 text-sm text-ink-2">
        No account needed — just your name, number and address.
      </p>
      <Suspense fallback={<CheckoutForm />}>
        <Form />
      </Suspense>
    </div>
  );
}
