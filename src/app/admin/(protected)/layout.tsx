import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CrumbProvider } from "@/components/admin/crumb";
import { Toaster } from "@/components/admin/toaster";
import { requireAdmin } from "@/lib/auth/guards";
import { getNavBadges } from "@/server/services/admin/dashboard";
import { getNotifications } from "@/server/services/admin/notifications";
import { AdminNav } from "./admin-nav";
import { AdminTopbar } from "./admin-topbar";

/**
 * Blocking route, deliberately.
 *
 * Every admin screen is per-user, behind auth, and reads live operational
 * data — there is no meaningful static shell to stream first, and rendering
 * one would only flash empty chrome at staff. `instant = false` tells Next
 * this navigation is expected to wait on the server rather than paint
 * immediately.
 */
export const instant = false;

/**
 * Belt and braces alongside robots.txt and the proxy gate. A crawler should
 * never reach these pages at all, but if one ever does — a leaked signed-in
 * session in a headless browser, a misconfigured preview deploy — the tag is
 * the last thing standing between the order queue and a search index.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The gate for every admin screen.
 *
 * `requireAdmin()` runs on the server before any child renders, so an
 * unauthorised user never receives the markup — not hidden, not present. Note
 * this protects *rendering* only: Server Actions are separately reachable over
 * HTTP, so each one re-checks permissions itself. There is no "the layout
 * already checked" shortcut.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nothing under /admin may be prerendered. Every screen is per-user, behind
  // auth, and reads live operational data — a static shell would be both
  // meaningless and a way to leak layout to anonymous requests. `connection()`
  // stops prerendering here for the whole subtree.
  await connection();

  const [session, badges, notifications] = await Promise.all([
    requireAdmin(),
    getNavBadges(),
    getNotifications(),
  ]);

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role ?? "customer",
  };

  return (
    // Toaster wraps the whole shell rather than each screen: an action fired in
    // the sidebar (sign out) or in a modal has to be able to report just as one
    // fired in the page body does.
    <Toaster>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        {/* AdminNav reads usePathname() to highlight the current section, which
          is dynamic URL data. Under Cache Components the layout prerenders a
          static shell, so that read has to sit behind a boundary — otherwise
          the shell cannot be generated at all. The fallback reserves the same
          width so the content does not jump when the nav streams in. */}
        <Suspense
          fallback={
            // Matches AdminNav's own box, sticky included, so the content does
            // not shift sideways or jump when the real nav streams in.
            <div className="h-14 shrink-0 border-line border-b bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:self-start lg:border-r lg:border-b-0" />
          }
        >
          <AdminNav user={user} badges={badges} />
        </Suspense>

        {/* A column so the topbar sticks to the top of the content area rather
            than the viewport — on desktop the sidebar sits beside it, and a
            viewport-fixed bar would cover that too. */}
        {/* The provider spans both, because the breadcrumb lives in the topbar
            but the name it should show is known only by the page below it. */}
        <CrumbProvider>
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar user={user} notifications={notifications} />

            {/* Grey page, white cards. The body is `bg-surface` (#ffffff) and so
                were the cards, separated only by a hairline — which is why the
                admin read as flat regardless of how the individual screens were
                laid out. Figure needs a ground. */}
            <main className="min-w-0 flex-1 bg-surface-2 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </CrumbProvider>
      </div>
    </Toaster>
  );
}
