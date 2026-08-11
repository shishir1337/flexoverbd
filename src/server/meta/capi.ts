import "server-only";
import { cookies, headers } from "next/headers";
import { buildUserData, type MetaUserData } from "@/lib/meta/hash";
import { getMetaCredentials } from "@/server/services/tracking-settings";

/**
 * Meta Conversions API — server-side event delivery.
 *
 * The browser pixel alone loses a large share of events to ad blockers, iOS
 * content blocking and tracking-prevention defaults — commonly 15–30 %, and
 * disproportionately the mobile traffic this shop lives on. Sending the same
 * events from the server recovers them, and for a cash-on-delivery store the
 * server is the only place that actually *knows* a purchase happened: the order
 * completes in `placeOrder`, not on a thank-you page the shopper may never load.
 *
 * Every send is best-effort. A failure here must never surface to a shopper who
 * has just placed a real order.
 */

/**
 * Pinned rather than tracking latest.
 *
 * v26.0 shipped 29 Jul 2026 — a fortnight old at time of writing. Meta supports
 * each version for about two years, so v25.0 (Feb 2026) runs well into 2028.
 * Losing conversion data to a teething bug costs more than the newest fields
 * gain, and `META_GRAPH_VERSION` makes the bump a config change rather than a
 * deploy.
 */
const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";

/**
 * Credentials are read per call, not captured at module load.
 *
 * They live in the database so the shop owner can connect their own ad account
 * without a developer, which means they can change while the process is
 * running — a module-scope constant would serve the old token until the next
 * deploy. Environment variables still win when set; see tracking-settings.ts.
 */

/** The standard events this shop sends. */
export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "CompleteRegistration";

export type MetaContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type MetaCustomData = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  contents?: MetaContent[];
  content_type?: "product" | "product_group";
  content_name?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
  search_string?: string;
};

type ServerEvent = {
  event_name: MetaEventName;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: "website";
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
};

/**
 * Request-scoped signals Meta matches on, pulled from cookies and headers.
 *
 * `_fbp` and `_fbc` are the browser and click identifiers the pixel drops.
 * After email they are the strongest match signal there is, and omitting them
 * is the most common reason a CAPI integration reports events successfully but
 * matches almost nobody.
 *
 * `_fbc` only exists once someone has arrived from a Meta ad. When it is
 * missing but the URL still carries `fbclid`, Meta's documented format lets us
 * construct it — otherwise an ad click that landed before the pixel wrote its
 * cookie is attributed to nothing.
 */
async function requestSignals(fbclid?: string | null) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  const fbp = cookieStore.get("_fbp")?.value ?? null;
  let fbc = cookieStore.get("_fbc")?.value ?? null;

  if (!fbc && fbclid) {
    // fb.{subdomain_index}.{creation_time_ms}.{fbclid}
    fbc = `fb.1.${Date.now()}.${fbclid}`;
  }

  return {
    fbp,
    fbc,
    // Behind a proxy the first x-forwarded-for entry is the real client.
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    userAgent: headerList.get("user-agent") ?? null,
  };
}

export type SendEventInput = {
  eventName: MetaEventName;
  /** Must equal the browser pixel's `eventID` for the same action. */
  eventId: string;
  eventSourceUrl?: string;
  customData?: MetaCustomData;
  user?: {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
    externalId?: string | null;
  };
  /** From the landing URL, when `_fbc` has not been set yet. */
  fbclid?: string | null;
};

/**
 * Send one event.
 *
 * Never throws and never rejects. Callers sit on the checkout path, and an
 * order that succeeded must not report failure because Meta was slow or a
 * token expired — the worst acceptable outcome is a missing analytics event.
 */
export async function sendMetaEvent(input: SendEventInput): Promise<void> {
  try {
    const { pixelId, accessToken, testEventCode } = await getMetaCredentials();
    // An unconfigured shop sends nothing rather than failing loudly — tracking
    // is optional, and the admin screen is where its absence is reported.
    if (!pixelId || !accessToken) return;

    const signals = await requestSignals(input.fbclid);

    const event: ServerEvent = {
      event_name: input.eventName,
      // Seconds, not milliseconds. Meta silently drops events timestamped in
      // the future or more than seven days old.
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      event_source_url: input.eventSourceUrl,
      action_source: "website",
      user_data: buildUserData({ ...input.user, ...signals }),
      custom_data: input.customData,
    };

    const body: Record<string, unknown> = { data: [event] };
    if (testEventCode) body.test_event_code = testEventCode;

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        // Analytics must not hold a shopper's request open. Five seconds is
        // generous for Meta and short enough not to be felt.
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      // Read the body: Meta explains exactly which field it disliked, and one
      // bad field rejects the entire batch.
      const detail = await response.text().catch(() => "");
      console.error(
        `Meta CAPI ${input.eventName} rejected (${response.status})`,
        detail.slice(0, 500),
      );
    }
  } catch (error) {
    console.error(`Meta CAPI ${input.eventName} failed`, error);
  }
}
