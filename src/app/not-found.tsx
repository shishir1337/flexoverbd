import { Compass, Home, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { getAllCategories } from "@/server/services/categories";

/**
 * Replaces Next's default 404, which renders as unstyled white-on-black and
 * looks like a crash on a light-themed storefront.
 *
 * A dead end is a lost sale, so this offers routes back in rather than just
 * apologising — the category list is the fastest way to re-enter the funnel.
 */
export default async function NotFound() {
  const categories = await getAllCategories();

  return (
    <div className="container-page flex flex-col items-center py-16 text-center lg:py-24">
      <span className="grid size-16 place-items-center rounded-full bg-brand-soft">
        <Compass
          aria-hidden
          className="size-8 text-brand-600"
          strokeWidth={1.6}
        />
      </span>

      <p className="mt-5 text-sm font-bold tracking-widest text-brand-on uppercase">
        Error 404
      </p>
      <h1 className="mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-2 sm:text-base">
        The link may be broken or the page may have moved. Everything we sell is
        still a tap away.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/" className={buttonStyles("primary", "md")}>
          <Home aria-hidden className="size-4" />
          Back to home
        </Link>
        <Link href="/categories" className={buttonStyles("secondary", "md")}>
          <LayoutGrid aria-hidden className="size-4" />
          All categories
        </Link>
      </div>

      <div className="mt-10 w-full max-w-2xl">
        <p className="mb-3 text-xs font-bold tracking-wide text-ink-3 uppercase">
          Or jump straight to a department
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="inline-flex rounded-chip border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 tap transition-colors hover:border-brand-500 hover:text-brand-on"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
