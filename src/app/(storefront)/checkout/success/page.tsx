import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { MetaPurchaseEvent } from "@/components/meta-purchase-event";
import { getOrderByNumber, toStorefrontOrder } from "@/server/services/orders";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage(
  props: PageProps<"/checkout/success">,
) {
  const params = await props.searchParams;
  const orderId = typeof params.order === "string" ? params.order : "";

  // Fetched here rather than in the component: the order lives in Postgres
  // now, so there is nothing to wait for on the client and no skeleton to
  // flash. Orders are also no longer device-local — this page works from any
  // phone that has the link.
  const row = orderId ? await getOrderByNumber(orderId) : null;
  const order = row ? toStorefrontOrder(row) : null;

  return (
    <>
      {/* Same event_id as the server sent, so Meta keeps one of the two. */}
      {order && (
        <MetaPurchaseEvent orderNumber={order.id} value={order.total} />
      )}
      <OrderConfirmation orderId={orderId} order={order} />
    </>
  );
}
