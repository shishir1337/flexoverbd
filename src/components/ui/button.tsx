import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Colour note: primary uses brand-600 (#e67700) rather than the raw brand
 * #ff8e02. It is visually the same orange but lifts white-on-orange contrast
 * to ~3.1:1, which clears the WCAG 1.4.11 bar for UI components. Pure #ff8e02
 * is reserved for surfaces that never carry text — badges, active indicators,
 * icon fills, focus glow. Swap `brand-600` → `brand-500` here if the client
 * wants the exact hex on buttons and accepts the contrast trade-off.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-btn font-semibold tap select-none " +
  "transition-[background-color,color,box-shadow,transform] duration-200 ease-(--ease-out-soft) " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-brand hover:bg-brand-700 focus-visible:outline-brand-400",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-brand-500 hover:text-brand-on",
  soft: "bg-brand-soft text-brand-on hover:bg-brand-100",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-3 hover:text-ink",
  dark: "bg-scrim text-white hover:bg-surface-3",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
  icon: "size-11 shrink-0",
  "icon-sm": "size-9 shrink-0",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, size, className)}
      {...props}
    />
  );
}
