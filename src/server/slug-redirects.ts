import { prisma } from "@/lib/prisma";

/**
 * Renamed-slug lookups for `proxy.ts`.
 *
 * Redirects have to happen before the response starts, and with Cache
 * Components every dynamic route streams a static shell first — by the time a
 * page component could call `permanentRedirect()`, a 200 has already gone out.
 * A browser still follows it, but a crawler sees a 200 with the wrong content,
 * so the rename loses exactly the ranking `SlugHistory` exists to preserve.
 * Proxy is the only place left where the redirect can be a real 308.
 *
 * The catch is that proxy sits on the hottest paths in the store, and the docs
 * are explicit that it must not do slow data fetching. So the whole table is
 * held in memory: it has one row per rename that has *ever* happened, which is
 * a handful even for a mature store.
 *
 * Staleness is bounded by a TTL rather than invalidated on write, because proxy
 * runs in its own bundle — a Server Action clearing this map would be clearing
 * a different copy of it. One minute before a rename starts redirecting is a
 * non-event; a redirect that never arrives because the invalidation crossed a
 * process boundary and vanished is not.
 */

type Cache = { map: Map<string, string>; loadedAt: number };

const TTL_MS = 60_000;

let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

async function load(): Promise<Cache> {
  const rows = await prisma.slugHistory.findMany({
    select: { entity: true, oldSlug: true, newSlug: true },
  });
  return {
    map: new Map(rows.map((r) => [`${r.entity}:${r.oldSlug}`, r.newSlug])),
    loadedAt: Date.now(),
  };
}

async function getCache(): Promise<Cache> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  // Concurrent requests during a refresh share one query rather than each
  // firing their own.
  inflight ??= load()
    .then((next) => {
      cache = next;
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function lookupRenamedSlug(
  entity: "product" | "category",
  oldSlug: string,
): Promise<string | null> {
  try {
    const { map } = await getCache();
    return map.get(`${entity}:${oldSlug}`) ?? null;
  } catch (e) {
    // A redirect lookup must never take the storefront down with it. Failing
    // open means the old URL 404s, which is what it did before this existed.
    console.error("slug redirect lookup failed", e);
    return null;
  }
}
