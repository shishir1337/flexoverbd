import { cacheLife, cacheTag } from "next/cache";
import "server-only";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";

/**
 * Old-slug lookups for permanent redirects.
 *
 * Renaming a product or category is a normal editorial act — a typo in a title,
 * a category that gets a better name — but the old URL is already in Google's
 * index, in Facebook posts and in customers' WhatsApp threads. `saveProduct`
 * and `saveCategory` record every rename here; this is the read side that turns
 * those rows into a 301 instead of a 404.
 *
 * Chained renames resolve in one hop because the actions *upsert* on
 * `(entity, oldSlug)`: renaming a → b → c rewrites the a-row's target to c
 * rather than leaving a redirect to a slug that no longer exists.
 */
export async function findRenamedSlug(
  entity: "product" | "category",
  oldSlug: string,
): Promise<string | null> {
  "use cache";
  // Tagged with the collection rather than the individual slug: the row is
  // written at the moment the old slug stops resolving, so there is no
  // per-slug tag left to invalidate.
  cacheTag(entity === "product" ? tags.products : tags.categories);
  cacheLife("days");

  const row = await prisma.slugHistory.findUnique({
    where: { entity_oldSlug: { entity, oldSlug } },
    select: { newSlug: true },
  });
  return row?.newSlug ?? null;
}
