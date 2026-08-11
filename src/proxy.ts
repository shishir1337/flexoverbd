import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { lookupRenamedSlug } from "@/server/slug-redirects";

/**
 * Two jobs, both of which have to happen before anything renders.
 *
 * Proxy runs before any route renders, which matters here: with Cache
 * Components the shell is prerendered and streamed, so a `redirect()` inside a
 * layout or page fires *after* a 200 and some markup have already gone out.
 * Functionally that still redirects a browser, but it leaks shell markup and
 * reports 200 to anything that is not a browser.
 *
 * 1. **Admin gate.** Deliberately an *optimistic* check — it only asks whether
 *    a session cookie exists, not whether it is valid, not signed out, and not
 *    for a user with a staff role. Validating properly means a database round
 *    trip on every admin request. The real check lives in
 *    `(protected)/layout.tsx` via `requireAdmin()`, which verifies the session,
 *    the ban flag and the role. This is a fast path to bounce the anonymous
 *    majority, not the security boundary.
 *
 * 2. **Renamed slugs.** A 308 to the current URL, so a renamed product or
 *    category keeps its search ranking and its inbound links. Backed by an
 *    in-memory map (see `slug-redirects.ts`), so the storefront paths do not
 *    pay for a query.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!getSessionCookie(request)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  const renamed = await resolveRename(pathname);
  if (renamed) {
    // 308 rather than 301: it preserves the method, and Next's own
    // `permanentRedirect` uses the same code.
    return NextResponse.redirect(new URL(renamed, request.url), 308);
  }

  return NextResponse.next();
}

/**
 * Only the first path segment is looked up. A subcategory keeps its own slug
 * across a parent rename — `/category/fragrances/unisex` becomes
 * `/category/perfumes/unisex`, not a redirect to the category root — so the
 * tail is carried through untouched.
 */
async function resolveRename(pathname: string): Promise<string | null> {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "product" && segments.length === 2) {
    const next = await lookupRenamedSlug("product", segments[1]);
    return next ? `/product/${next}` : null;
  }

  if (segments[0] === "category" && segments.length >= 2) {
    const next = await lookupRenamedSlug("category", segments[1]);
    if (!next) return null;
    const tail = segments.slice(2).join("/");
    return tail ? `/category/${next}/${tail}` : `/category/${next}`;
  }

  return null;
}

export const config = {
  // /admin/login must stay reachable while signed out, or this is a loop.
  matcher: [
    "/admin",
    "/admin/((?!login).*)",
    "/product/:path*",
    "/category/:path*",
  ],
};
