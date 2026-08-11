import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn, compactCount, discountPercent, formatBDT } from "@/lib/utils";

/* ------------------------------------------------------------------ Badge */

type BadgeTone = "brand" | "danger" | "success" | "neutral" | "dark";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-brand-500 text-white",
  danger: "bg-danger text-white",
  success: "bg-success text-white",
  neutral: "bg-surface/90 text-ink backdrop-blur-sm",
  dark: "bg-scrim/85 text-white backdrop-blur-sm",
};

export function Badge({
  tone = "brand",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-bold tracking-wide uppercase",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Rating */

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starSize = size === "sm" ? "size-3.5" : "size-4";
  return (
    <div
      // One label for the whole widget; the individual stars stay decorative.
      role="img"
      aria-label={`Rated ${value} out of 5${count ? ` from ${count} reviews` : ""}`}
      className={cn("flex items-center gap-1", className)}
    >
      <Star aria-hidden className={cn(starSize, "fill-gold text-gold")} />
      <span
        className={cn(
          "font-semibold text-ink tnum",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {value.toFixed(1)}
      </span>
      {count !== undefined && (
        <span
          className={cn("text-ink-3", size === "sm" ? "text-xs" : "text-sm")}
        >
          ({compactCount(count)})
        </span>
      )}
    </div>
  );
}

/** Five discrete stars — used in the reviews section where detail matters. */
export function StarRow({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Rated ${value} out of 5`}
      className={cn("flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-4",
            i <= Math.round(value)
              ? "fill-gold text-gold"
              : "fill-surface-3 text-surface-3",
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Price */

export function Price({
  price,
  compareAt,
  size = "md",
  className,
}: {
  price: number;
  compareAt?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const off = discountPercent(price, compareAt);
  const main =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
        className,
      )}
    >
      <span data-price className={cn("font-bold text-ink", main)}>
        {formatBDT(price)}
      </span>
      {off > 0 && (
        <>
          <span
            data-price
            className="text-xs text-ink-3 line-through decoration-ink-4"
          >
            {formatBDT(compareAt as number)}
          </span>
          <span className="text-xs font-bold text-danger">-{off}%</span>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} />;
}

/* --------------------------------------------------------- Section header */

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-end justify-between gap-4 sm:mb-5",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-on uppercase">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-extrabold text-ink sm:text-2xl">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 hidden text-sm text-ink-3 sm:block">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Rail */

/** Re-exported so the UI barrel stays the single import site for primitives. */
export { Rail } from "./rail";
