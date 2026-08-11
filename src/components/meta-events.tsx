"use client";

import { useEffect, useRef } from "react";
import { trackMetaEvent } from "@/components/meta-pixel";

/**
 * Browser-side funnel events.
 *
 * These three are browser-only, unlike Purchase.
 *
 * Purchase is worth sending twice because it is the money event and losing it
 * to an ad blocker costs real attribution. ViewContent, AddToCart and
 * InitiateCheckout are cheap signals used mainly to build audiences, and every
 * server-side copy costs a request on a page a shopper is actively waiting for.
 * The browser is also the only place that genuinely knows a *view* happened.
 *
 * If match quality later proves too low for retargeting, these can move to the
 * server the same way Purchase did — `sendMetaEvent` already takes them.
 */

/** Stable per-view id so a server copy could dedupe against it later. */
function viewId(prefix: string, key: string) {
  return `${prefix}_${key}_${Date.now()}`;
}

/**
 * A product-page view.
 *
 * Reported as `product_group` keyed on the slug, not `product` keyed on a SKU.
 * Viewing a page is not a variant-level act — the shopper has not chosen a
 * colour or size yet — whereas Purchase genuinely is, and sends the SKU of what
 * was actually bought. Forcing both into one id space would misreport one of
 * them; Meta models this distinction with content_type for exactly this reason.
 */
export function MetaViewContent({
  slug,
  name,
  value,
  category,
}: {
  slug: string;
  name: string;
  value: number;
  category?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !slug) return;
    sent.current = true;

    trackMetaEvent("ViewContent", viewId("vc", slug), {
      content_type: "product_group",
      content_ids: [slug],
      content_name: name,
      content_category: category,
      value,
      currency: "BDT",
    });
  }, [slug, name, value, category]);

  return null;
}

/**
 * Called from an event handler, not rendered — carts change without navigation.
 *
 * Keyed on slug as `product_group`, matching ViewContent rather than Purchase.
 * The cart line has no SKU client-side; its id is an internal composite
 * (`p-001::colour:Navy::size:M`) that would match nothing in a catalogue feed.
 * Keeping browse-stage events in one id space means an audience built from
 * "viewed but did not add" actually compares like with like.
 */
export function trackAddToCart(input: {
  slug: string;
  name: string;
  price: number;
  qty: number;
}) {
  trackMetaEvent("AddToCart", viewId("atc", input.slug), {
    content_type: "product_group",
    content_ids: [input.slug],
    content_name: input.name,
    contents: [
      { id: input.slug, quantity: input.qty, item_price: input.price },
    ],
    value: input.price * input.qty,
    currency: "BDT",
  });
}

export function MetaInitiateCheckout({
  value,
  numItems,
  slugs,
}: {
  value: number;
  numItems: number;
  slugs: string[];
}) {
  const sent = useRef(false);

  useEffect(() => {
    // Zero items means the cart is still hydrating from localStorage; firing
    // then would report an empty checkout on every page load.
    if (sent.current || numItems === 0) return;
    sent.current = true;

    trackMetaEvent("InitiateCheckout", viewId("ic", String(numItems)), {
      content_type: "product_group",
      content_ids: slugs,
      num_items: numItems,
      value,
      currency: "BDT",
    });
  }, [value, numItems, slugs]);

  return null;
}
