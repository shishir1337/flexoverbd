import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin chrome primitives.
 *
 * The admin had drifted into 71 hand-written buttons across 19 files at four
 * different heights, six page widths and three heading treatments. Nothing was
 * individually wrong; together they read as a screen assembled by different
 * people, which is exactly what "messy" means in practice.
 *
 * These are separate from the storefront's `Button` on purpose. The storefront
 * is a shop — generous tap targets, brand orange, soft shadows. An admin is a
 * tool used for hours at a time: denser, quieter, and reserving the brand
 * colour for the one action per screen that matters.
 */

/* ------------------------------------------------------------------ Button */

export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-soft";
export type AdminButtonSize = "sm" | "md" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-btn font-semibold " +
  "whitespace-nowrap select-none tap transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-1 " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<AdminButtonVariant, string> = {
  // One per screen. Everything else is secondary or ghost — an admin where
  // three buttons are orange has no primary action at all.
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary:
    "border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
  ghost: "bg-transparent text-ink-3 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:brightness-95",
  "danger-soft":
    "border border-line bg-surface text-ink-2 hover:border-danger hover:text-danger",
};

/**
 * Two text sizes only. `sm` is the default for anything sitting inside a card
 * or a row; `md` is for the one primary action in a page header.
 */
const sizes: Record<AdminButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  // Both icon sizes are drawn under 44px, which is right for a mouse and a coin
  // flip for a thumb. `hit-touch` pads the target on touch devices only, so the
  // rows stay dense on a desktop and tappable on the phone staff pack from.
  icon: "size-9 shrink-0 hit-touch",
  "icon-sm": "size-8 shrink-0 hit-touch",
};

export function adminButton(
  variant: AdminButtonVariant = "secondary",
  size: AdminButtonSize = "sm",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
};

export function AdminButton({
  variant = "secondary",
  size = "sm",
  className,
  type = "button",
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={adminButton(variant, size, className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Card */

/**
 * A white panel on the grey admin page.
 *
 * The elevation matters more than it sounds: before this the page and the
 * cards were both `#ffffff`, separated only by a `#e7e9ee` hairline, so
 * nothing read as sitting *on* anything. A card that cannot be distinguished
 * from its background is not a card.
 */
export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  /** Right-aligned controls in the card header. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-xs",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-line border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-bold text-ink text-sm">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-ink-3 text-xs">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------- Page shell */

/**
 * One width for every admin screen.
 *
 * Six different max-widths meant the content jumped sideways on almost every
 * navigation. `wide` is for anything with a table; `narrow` for forms, where a
 * 1200px-wide text input is unreadable.
 */
export function Page({
  width = "wide",
  children,
}: {
  width?: "wide" | "narrow";
  children: ReactNode;
}) {
  return (
    <div
      className={cn("mx-auto", width === "wide" ? "max-w-6xl" : "max-w-3xl")}
    >
      {children}
    </div>
  );
}

/**
 * Section heading between cards. One treatment, so "is this a card title or a
 * section title" stops being a judgement call per screen.
 */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-bold text-ink text-sm">{children}</h2>
      {action}
    </div>
  );
}
