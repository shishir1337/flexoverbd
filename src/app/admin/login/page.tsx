import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getSession } from "@/lib/auth/guards";
import { isAdminRole } from "@/lib/auth/permissions";
import { LoginForm } from "./login-form";

/**
 * Blocking route: this page reads the session to bounce already-signed-in staff
 * straight to the dashboard, so there is nothing meaningful to prerender.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const { banned } = await props.searchParams;

  // Already signed in as staff? Skip the form. A signed-in *customer* is left
  // on it, because for them this page is not a redirect loop — it is a chance
  // to sign in with the right account.
  const session = await getSession();
  if (session && isAdminRole(session.user.role)) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo markSize={48} />
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h1 className="text-xl font-extrabold text-ink">Admin sign in</h1>
          <p className="mt-1 mb-5 text-sm text-ink-3">
            Staff access only. Customers can sign in from the storefront.
          </p>

          <LoginForm banned={banned === "1"} />
        </div>

        <p className="mt-4 text-center text-xs text-ink-3">
          Trouble signing in? Contact the store owner.
        </p>
      </div>
    </main>
  );
}
