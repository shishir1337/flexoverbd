"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * The Meta Pixel, paired with the Conversions API.
 *
 * Both halves send the same events. That is deliberate, not duplication: the
 * browser catches signals the server cannot see (`_fbp`, viewport, referrer),
 * the server catches the shoppers whose browser never reports (ad blockers, iOS
 * content blocking — routinely 15–30 % of mobile traffic). Meta reconciles them
 * on `event_id`, keeping whichever arrives first.
 *
 * The pixel is loaded `afterInteractive` rather than blocking: analytics must
 * never sit in front of the first paint on a 4G connection.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown };
    _fbq?: unknown;
  }
}

/**
 * Fire a browser event that the server will also send.
 *
 * `eventId` must be byte-identical to the `event_id` on the matching server
 * event, and the event name must match too — Meta requires both to dedupe.
 */
export function trackMetaEvent(
  name: string,
  eventId: string,
  data?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", name, data ?? {}, { eventID: eventId });
}

export function MetaPixel({ pixelId }: { pixelId?: string }) {
  const pathname = usePathname();
  /**
   * The path the last PageView was reported for.
   *
   * Comparing against it does two jobs: it skips the first render, where the
   * inline snippet has already fired PageView and firing again would
   * double-count every landing, and it ignores effect re-runs that are not
   * actually navigations.
   */
  const reportedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pixelId) return;
    if (reportedPath.current === pathname) return;

    const isFirstRender = reportedPath.current === null;
    reportedPath.current = pathname;
    if (isFirstRender) return;

    // Client-side navigation does not reload the document, so the snippet's
    // own PageView never fires again.
    window.fbq?.("track", "PageView");
  }, [pathname, pixelId]);

  if (!pixelId) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');
fbq('track','PageView');`}
    </Script>
  );
}
