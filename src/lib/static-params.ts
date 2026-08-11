/**
 * Keeping `generateStaticParams` non-empty under Cache Components.
 *
 * Cache Components refuses to build a dynamic route whose
 * `generateStaticParams` returns nothing:
 *
 *   Error: When using Cache Components, all `generateStaticParams` functions
 *   must return at least one result.
 *
 * The rule exists so the build can prerender one real page per route and prove
 * it never reaches for `cookies()`, `headers()` or `searchParams` outside a
 * dynamic boundary. With no rows to prerender there is nothing to validate
 * against, so the build fails instead.
 *
 * That turns an ordinary state — a shop that has not added its first product
 * yet, a fresh clone, a CI database seeded empty — into a build failure. The
 * documented escape is to return a placeholder and let the page 404 it, which
 * is what this does.
 *
 * The trade-off is real and worth stating: on an empty catalogue the build
 * validates against a param that resolves to `notFound()`, so it proves less
 * than it would with a real slug. The moment one product exists the real slugs
 * take over and full validation resumes. A build that cannot run at all
 * validates nothing, so this is strictly the better of the two.
 */

/**
 * Impossible as a real slug: every slug the admin generates is lowercase
 * alphanumerics and single dashes, so the underscores guarantee no collision
 * with a product someone might actually create.
 */
export const PLACEHOLDER_SLUG = "__none__";

/**
 * Returns `params` unchanged, or a single placeholder when it is empty.
 *
 * The placeholder route builds as a 404, which is the correct answer for it —
 * nothing links there and the sitemap is generated from real rows.
 */
export function withPlaceholder<T extends Record<string, string>>(
  params: T[],
  placeholder: T,
): T[] {
  return params.length > 0 ? params : [placeholder];
}
