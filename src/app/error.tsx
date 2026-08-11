"use client";

import { Home, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/button";
import { contact } from "@/lib/site";

/**
 * Route-level error boundary.
 *
 * Without this file a thrown render error takes down the whole page and Next
 * shows its own unstyled fallback — on a storefront that reads as "this shop is
 * broken" and the visitor leaves. Here the chrome survives, so the header, cart
 * and nav still work and the session is recoverable.
 *
 * `retry` re-runs the failed segment (stable since Next 16.3; it was
 * `unstable_retry` in 16.2).
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Stands in for the error reporting service the backend will bring.
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-16 text-center lg:py-24">
      <span className="grid size-16 place-items-center rounded-full bg-danger-soft">
        <TriangleAlert
          aria-hidden
          className="size-8 text-danger"
          strokeWidth={1.6}
        />
      </span>

      <h1 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-2 sm:text-base">
        This page failed to load. Your cart is safe — trying again usually fixes
        it.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={retry}
          className={buttonStyles("primary", "md")}
        >
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </button>
        <Link href="/" className={buttonStyles("secondary", "md")}>
          <Home aria-hidden className="size-4" />
          Back to home
        </Link>
      </div>

      <p className="mt-8 text-sm text-ink-3">
        Still stuck? Call{" "}
        <a
          href={contact.phoneHref}
          className="font-semibold text-brand-on tnum underline-offset-2 hover:underline"
        >
          {contact.phoneDisplay}
        </a>
      </p>

      {/* The digest is the only handle support has on a production error, and
          it is meaningless to the shopper — so it is present but quiet. */}
      {error.digest && (
        <p className="mt-2 text-2xs text-ink-4">Reference: {error.digest}</p>
      )}
    </div>
  );
}
