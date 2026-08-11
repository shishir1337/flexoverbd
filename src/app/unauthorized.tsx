import { LogIn } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

/**
 * Rendered when a guard calls `unauthorized()` — nobody is signed in. The fix
 * is a sign-in link, so that is the whole page.
 */
export default function Unauthorized() {
  return (
    <main className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft">
          <LogIn aria-hidden className="size-7 text-brand-600" />
        </span>
        <h1 className="mt-4 font-extrabold text-ink text-xl sm:text-2xl">
          Please sign in
        </h1>
        <p className="mt-2 text-ink-2 text-sm">
          This page needs an account. Ordering never does — you can always{" "}
          <Link href="/track-order" className="font-semibold text-brand-on">
            track an order
          </Link>{" "}
          without one.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/login" className={buttonStyles("primary", "md")}>
            Sign in
          </Link>
          <Link href="/register" className={buttonStyles("secondary", "md")}>
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
