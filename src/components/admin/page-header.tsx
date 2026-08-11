import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublishCrumb } from "@/components/admin/crumb";
import { cn } from "@/lib/utils";

/**
 * The top of every admin screen.
 *
 * Each screen had grown its own version of this — some with a back link, some
 * without, one with the action button above the subtitle and the rest below,
 * and two that let a long description shove the primary button onto its own
 * line. Extracted so the answer to "where is the New button" is the same
 * everywhere, and so the actions stay pinned right regardless of how much
 * description sits beside them.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  meta,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Parent screen, for anything nested. */
  back?: { href: string; label: string };
  /** Primary and secondary buttons, right-aligned on anything above a phone. */
  actions?: ReactNode;
  /** Status chips and counts, under the title. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5", className)}>
      <PublishCrumb value={title} />
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex min-h-9 items-center gap-1.5 text-ink-3 text-sm tap hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-2xl text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-prose text-ink-3 text-sm">{subtitle}</p>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

const TONES = {
  neutral: "border-line bg-surface-2 text-ink-2",
  success: "border-success/25 bg-success-soft text-success",
  warn: "border-warn/25 bg-warn-soft text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger",
  brand: "border-brand-200 bg-brand-soft text-brand-on",
} as const;

/** Small status pill, used in headers and table rows. */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 font-semibold text-2xs",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Empty state.
 *
 * Every list in the admin used to end in a single grey sentence centred in a
 * box. That tells someone the list is empty but not whether that is normal, and
 * never what to do about it — so each one now carries an icon, a reason and,
 * where there is one, the action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-line border-dashed bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-2">
        <Icon aria-hidden className="size-5 text-ink-4" />
      </span>
      <p className="mt-3 font-bold text-ink text-sm">{title}</p>
      {body && <p className="mt-1 max-w-sm text-ink-3 text-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
