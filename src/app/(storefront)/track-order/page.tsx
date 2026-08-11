import { Package } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracker } from "@/components/account/order-tracker";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Check where your FlexOver BD parcel is using your order number or the mobile number you ordered with. No account needed.",
  alternates: { canonical: "/track-order" },
};

/**
 * The `?q=` prefill is the only request-time thing on this page, and it sits
 * inside the form. Awaiting it in the page body would cost the whole route its
 * static shell — heading, breadcrumb and all — for one input's default value.
 */
async function Tracker({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <OrderTracker initialQuery={typeof params.q === "string" ? params.q : ""} />
  );
}

export default function TrackOrderPage(props: PageProps<"/track-order">) {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Track order" }]}
      />
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft">
          <Package aria-hidden className="size-7 text-brand-600" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
          Track your order
        </h1>
        <p className="mt-1.5 text-sm text-ink-2 sm:text-base">
          No account needed — just your order number or the mobile number you
          ordered with.
        </p>
      </div>
      {/* No fallback: the form is the page, and a skeleton that is replaced
          a moment later by an identically-sized form is just a flicker. */}
      <Suspense fallback={null}>
        <Tracker searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
