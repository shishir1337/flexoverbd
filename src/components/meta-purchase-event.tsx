"use client";

import { useEffect, useRef } from "react";
import { trackMetaEvent } from "@/components/meta-pixel";

/**
 * The browser half of the Purchase event.
 *
 * The server already sent this from `placeOrder`, with the same `event_id` —
 * Meta keeps whichever arrives first and discards the other, within a 48-hour
 * window. So this is not a second conversion; it is the same one, reported over
 * a second channel in case the first was lost.
 *
 * Worth being clear about which one usually wins: the server fires at order
 * creation, so it normally arrives first, and that is the better outcome — it
 * carries hashed email, phone and name, which match far more reliably than
 * anything the browser knows. This half exists for the reverse case, and to
 * contribute `_fbp` when the server had no cookie to read.
 *
 * Fires once per mount. A shopper who refreshes the confirmation page has not
 * bought anything twice.
 */
export function MetaPurchaseEvent({
  orderNumber,
  value,
}: {
  orderNumber: string;
  value: number;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !orderNumber) return;
    sent.current = true;

    trackMetaEvent("Purchase", orderNumber, {
      value,
      currency: "BDT",
      order_id: orderNumber,
    });
  }, [orderNumber, value]);

  return null;
}
