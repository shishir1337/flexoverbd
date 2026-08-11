import { Home, ShieldX } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

/**
 * Rendered when a guard calls `forbidden()` — a signed-in person without the
 * role for what they asked for. Distinct from not-found on purpose: pretending
 * the page does not exist would leave a staff member with the wrong role
 * hunting for a broken link.
 */
export default function Forbidden() {
  return (
    <main className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface-2">
          <ShieldX aria-hidden className="size-7 text-ink-4" />
        </span>
        <p className="mt-4 font-bold text-2xs text-brand-on uppercase tracking-wide">
          Not allowed
        </p>
        <h1 className="mt-1 font-extrabold text-ink text-xl sm:text-2xl">
          You do not have access to this
        </h1>
        <p className="mt-2 text-ink-2 text-sm">
          Your account is signed in, but it does not have permission for this
          page. If you think it should, ask the store owner to check your role.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonStyles("primary", "md")}>
            <Home aria-hidden className="size-4" />
            Back to the shop
          </Link>
          <Link href="/account" className={buttonStyles("secondary", "md")}>
            Your account
          </Link>
        </div>
      </div>
    </main>
  );
}
