import type { LucideIcon } from "lucide-react";
import { type ReactNode, Suspense } from "react";
import { ListingJsonLd } from "@/components/seo/listing-json-ld";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import type { Product } from "@/data/types";
import { ListingSection, ListingSkeleton } from "./listing-section";

/**
 * Shell for the curated listings — offers, best sellers, new arrivals, top
 * rated. They differ only in which slice of the catalogue they pass in, so
 * they share one layout rather than four near-identical pages.
 *
 * Takes the `searchParams` *promise* rather than its resolved value: awaiting
 * it in the page body would make the header, breadcrumb and JSON-LD
 * request-time too, even though they are identical for every visitor. Behind
 * the boundary below, only the grid waits.
 */
export function ListingPage({
  pathname,
  searchParams,
  products,
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  crumbs,
  emptyMessage,
  children,
}: {
  pathname: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  products: Product[];
  title: string;
  subtitle: string;
  eyebrow?: string;
  icon?: LucideIcon;
  crumbs?: Crumb[];
  emptyMessage?: string;
  /** Optional block between the header and the grid, e.g. a countdown. */
  children?: ReactNode;
}) {
  return (
    <div className="container-page py-3 pb-14">
      {/* Only the first screenful is described: an ItemList of 60 products
          bloats the HTML for no ranking benefit. */}
      <ListingJsonLd
        name={title}
        description={subtitle}
        path={pathname}
        products={products.slice(0, 24)}
        trail={(crumbs ?? [])
          .filter((c) => c.href && c.href !== "/")
          .map((c) => ({ name: c.label, path: c.href as string }))}
      />

      <Breadcrumb
        className="mb-3"
        items={crumbs ?? [{ label: "Home", href: "/" }, { label: title }]}
      />

      <header className="mb-6">
        {eyebrow && (
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-on uppercase">
            {Icon && <Icon aria-hidden className="size-4" />}
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2 sm:text-base">
          {subtitle}
        </p>
      </header>

      {children}

      <Suspense fallback={<ListingSkeleton />}>
        <ListingSection
          searchParams={searchParams}
          pathname={pathname}
          products={products}
          emptyMessage={emptyMessage}
        />
      </Suspense>
    </div>
  );
}
