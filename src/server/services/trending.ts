"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";

/**
 * Trending searches, kept current by the shop's own traffic.
 *
 * The list used to be entirely hand-written, so it showed what staff *guessed*
 * shoppers wanted rather than what they typed — and it went stale the moment
 * nobody remembered to edit it.
 *
 * Now every search that finds something is counted, and the list is the terms
 * people actually use. Hand-written entries still work: a pinned term always
 * shows, which is what a campaign needs before anyone has searched for it yet.
 */

/** Below this, a "search" is someone still typing. */
const MIN_LENGTH = 2;
const MAX_LENGTH = 40;

/**
 * Reduce a raw query to the form that gets counted.
 *
 * Case and spacing are noise — "Blue Shirt", "blue  shirt" and "blue shirt" are
 * one term. Anything else is left alone: stemming "shirts" to "shirt" would
 * merge terms the shop may legitimately want to tell apart.
 */
function normalizeTerm(raw: string): string | null {
  const term = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (term.length < MIN_LENGTH || term.length > MAX_LENGTH) return null;
  // Pure punctuation or digits are not terms anyone wants suggested.
  if (!/[a-zঀ-৿]/.test(term)) return null;
  return term;
}

/**
 * Count one search.
 *
 * Only called when the search actually matched something. A typo that returns
 * nothing is not a trend — suggesting it would send the next shopper into the
 * same dead end, and misspellings would climb the list precisely because they
 * get retried.
 *
 * Never throws: a failure to record analytics must not break the page the
 * shopper is trying to read.
 */
export async function recordSearch(rawTerm: string, resultCount: number) {
  if (resultCount <= 0) return;

  const term = normalizeTerm(rawTerm);
  if (!term) return;

  try {
    await prisma.trendingSearch.upsert({
      where: { term },
      update: { hits: { increment: 1 }, lastSeenAt: new Date() },
      create: { term, hits: 1, lastSeenAt: new Date(), isActive: true },
    });

    // Deliberately not revalidating the trending tag on every search: the list
    // is a suggestion, not a live counter, and invalidating a cached read on
    // each keystroke-driven search would cost far more than the freshness is
    // worth. `cacheLife("hours")` on the read is what keeps it moving.
  } catch (error) {
    console.error("recordSearch failed", error);
  }
}

/**
 * Clear a term staff do not want suggested.
 *
 * Real traffic surfaces real language, some of which a shop would rather not
 * put in its own header. Deactivating keeps the row so it does not simply
 * climb back next time someone searches it.
 */
export async function hideTrendingTerm(term: string) {
  await prisma.trendingSearch.updateMany({
    where: { term },
    data: { isActive: false },
  });
  revalidateTag(tags.trending, "max");
}
