import { cacheLife } from "next/cache";

/**
 * Time values that are safe to prerender.
 *
 * Under Cache Components a bare `new Date()` in a Server Component fails the
 * build: the value changes between renders, so Next cannot put it in a static
 * shell. Wrapping it in `use cache` gives the prerenderer a stable value and a
 * refresh interval instead.
 *
 * These live together so there is one obvious place to look when something
 * needs "now" during render.
 */

/** Footer copyright. Refreshes daily, which is 365× more often than it needs. */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * "Now", rounded down to the minute and cached for one.
 *
 * Countdowns and "is this flash sale live" checks need a current timestamp
 * during render, which a static shell cannot contain. Rounding to the minute
 * means every render inside the same minute agrees, so the prerenderer gets a
 * stable value and the page does not have to become request-time to know
 * roughly what time it is.
 *
 * Returned as epoch milliseconds because a `Date` crossing to a Client
 * Component is serialised anyway, and a number cannot pick up a timezone on
 * the way.
 */
export async function getApproximateNow(): Promise<number> {
  "use cache";
  cacheLife("minutes");
  const now = Date.now();
  return now - (now % 60_000);
}
