import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";

/**
 * Shell for the written pages — policies, FAQ, about.
 *
 * Measure is capped at ~68 characters because these are the only pages on the
 * site with real long-form reading, and a full-width paragraph on a desktop
 * monitor is genuinely hard to track line to line.
 */
export function ProsePage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  /** Policy pages need a visible "last reviewed" date to be credible. */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: title }]}
      />

      <div className="mx-auto max-w-[68ch]">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-2 text-sm leading-relaxed text-ink-2 sm:text-base">
              {intro}
            </p>
          )}
          {updated && (
            <p className="mt-3 text-xs text-ink-3">Last updated {updated}</p>
          )}
        </header>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: these lists are authored literals that never reorder or splice, and the items are arbitrary ReactNodes with no stable field to key on.
          key={i}
          className="flex gap-2.5"
        >
          <span
            aria-hidden
            className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500"
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
