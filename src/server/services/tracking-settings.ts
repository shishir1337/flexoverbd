import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";

/**
 * Meta tracking credentials, editable from the admin.
 *
 * These started as environment variables, which is the safer default for a
 * secret — but it makes the shop owner dependent on a developer to connect
 * their own ad account, and that is not a workable handover. So they move to
 * the database, with the split below.
 *
 * **The pixel id is public.** It is embedded in the page for every visitor to
 * read; treating it as a secret would be theatre.
 *
 * **The access token is not.** It can write events into the client's ad
 * account, so it is read on the server only and never returned to any client
 * component. `getMetaCredentials` is the sole way to reach it, this module is
 * `server-only`, and the admin form is deliberately write-only — see
 * `tracking-actions.ts`.
 *
 * Environment variables still win when set. A staging deploy can point at a
 * test pixel without touching the database it shares, and an operator who has
 * locked themselves out of the admin has a way back in.
 */

export type MetaCredentials = {
  pixelId: string | null;
  accessToken: string | null;
  testEventCode: string | null;
};

type TrackingRow = {
  metaPixelId?: string;
  metaAccessToken?: string;
  metaTestEventCode?: string;
};

async function readRow(): Promise<TrackingRow> {
  const row = await prisma.setting.findUnique({ where: { key: "tracking" } });
  return (row?.value as TrackingRow) ?? {};
}

/**
 * Everything the server needs to send events. Never call this from a client
 * component — it returns the raw token.
 */
export async function getMetaCredentials(): Promise<MetaCredentials> {
  const stored = await readRow();

  return {
    pixelId:
      process.env.NEXT_PUBLIC_META_PIXEL_ID || stored.metaPixelId || null,
    accessToken:
      process.env.META_CAPI_ACCESS_TOKEN || stored.metaAccessToken || null,
    testEventCode:
      process.env.META_TEST_EVENT_CODE || stored.metaTestEventCode || null,
  };
}

/**
 * Just the pixel id — safe to hand to the browser, which sees it anyway.
 *
 * Cached because the storefront layout reads it on every page, including ones
 * that prerender statically. An uncached database call here makes the whole
 * layout dynamic and breaks the build for pages like /about that have no
 * business hitting Postgres. Tagged with `settings`, so saving from the admin
 * publishes a new pixel id without a deploy.
 */
export async function getMetaPixelId(): Promise<string | null> {
  "use cache";
  cacheTag(tags.settings, tags.setting("tracking"));
  cacheLife("hours");

  const row = await prisma.setting.findUnique({ where: { key: "tracking" } });
  const stored = (row?.value as TrackingRow) ?? {};
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || stored.metaPixelId || null;
}

/**
 * What the admin screen may see.
 *
 * Reports *whether* a token exists, never the token. Rendering it back into a
 * form field would put a credential that can write to the client's ad account
 * into the page source of every admin session, recoverable by anything that can
 * read the DOM.
 */
export type TrackingStatus = {
  pixelId: string;
  hasToken: boolean;
  testEventCode: string;
  /** True when a value comes from the environment and the form cannot change it. */
  pixelFromEnv: boolean;
  tokenFromEnv: boolean;
};

export async function getTrackingStatus(): Promise<TrackingStatus> {
  const stored = await readRow();

  return {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || stored.metaPixelId || "",
    hasToken: Boolean(
      process.env.META_CAPI_ACCESS_TOKEN || stored.metaAccessToken,
    ),
    testEventCode:
      process.env.META_TEST_EVENT_CODE || stored.metaTestEventCode || "",
    pixelFromEnv: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    tokenFromEnv: Boolean(process.env.META_CAPI_ACCESS_TOKEN),
  };
}
