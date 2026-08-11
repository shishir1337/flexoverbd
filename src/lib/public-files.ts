import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Server-only resolution of an artwork path to the file that actually exists
 * in `public/`.
 *
 * The whole homepage renders statically, so this runs at build time and costs
 * nothing per request. Two things it buys us:
 *
 *  1. Art that has not been supplied yet renders a branded placeholder instead
 *     of firing a failed image request.
 *  2. The extension in the data file is a *hint*, not a contract. Data can say
 *     `.jpg` while the file on disk is `.webp` (or the client later drops in a
 *     `.png`) and it still resolves — so nobody has to touch code to swap an
 *     image.
 *
 * Remote URLs pass straight through. This helper predates the ImageKit media
 * library, back when every image was a file in `public/`; it answered "is this
 * on disk?" by returning null when it was not, and callers render a
 * placeholder for null. A CDN URL is not on disk, so it was being reported
 * missing and every uploaded product photo rendered as a placeholder while the
 * data was perfectly correct.
 */

const publicDir = path.join(process.cwd(), "public");
const cache = new Map<string, string | null>();

/** Tried in order; the declared extension always wins if it exists. */
const EXTENSIONS = [".svg", ".webp", ".avif", ".jpg", ".jpeg", ".png"];

/**
 * Returns a usable image src, or null when a local file genuinely is missing.
 *
 * Remote (`http://`, `https://`) and inline (`data:`) sources are returned
 * unchanged: there is no file on disk to look for, and whether the CDN serves
 * them is not a question this can answer at build time.
 */
export function resolvePublicImage(src: string): string | null {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  if (!src.startsWith("/")) return null;

  const cached = cache.get(src);
  if (cached !== undefined) return cached;

  const rel = src.replace(/^\/+/, "").split("?")[0];
  const abs = path.join(publicDir, ...rel.split("/"));

  // Guard against a data typo escaping the public directory.
  if (!abs.startsWith(publicDir)) {
    cache.set(src, null);
    return null;
  }

  let found: string | null = null;

  if (existsSync(abs)) {
    found = src;
  } else {
    const ext = path.extname(abs);
    const base = ext ? abs.slice(0, -ext.length) : abs;
    const baseSrc = ext ? src.slice(0, -ext.length) : src;

    for (const candidate of EXTENSIONS) {
      if (candidate === ext) continue;
      if (existsSync(base + candidate)) {
        found = baseSrc + candidate;
        break;
      }
    }
  }

  cache.set(src, found);
  return found;
}

export function publicFileExists(src: string): boolean {
  return resolvePublicImage(src) !== null;
}
