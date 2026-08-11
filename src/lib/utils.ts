import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bangladeshi Taka formatting.
 * Uses en-BD grouping (1,25,000 style is *not* used for BDT on local
 * commerce sites — Daraz/Chaldal use plain thousands separators, so we do too).
 */
export function formatBDT(amount: number, opts?: { withSymbol?: boolean }) {
  const withSymbol = opts?.withSymbol ?? true;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return withSymbol ? `৳${formatted}` : formatted;
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Compact rating count: 1240 -> "1.2k" */
export function compactCount(n: number) {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
}
