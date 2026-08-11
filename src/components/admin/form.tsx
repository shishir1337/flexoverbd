"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared admin form furniture.
 *
 * Every admin screen validates on the server and renders the same three
 * things: a card per group of fields, a labelled control with an error slot,
 * and a banner for whatever the action rejected. Extracted here so a new screen
 * is a form, not another copy of the chrome — and so the error styling stays
 * identical everywhere, which is what makes it recognisable.
 */

export function inputCls(error?: string) {
  return cn(
    "h-10 w-full rounded-btn border bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:outline-none",
    error ? "border-danger" : "border-line focus:border-brand-500",
  );
}

export function textareaCls(error?: string) {
  return cn(
    "w-full rounded-btn border bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-4 focus:outline-none",
    error ? "border-danger" : "border-line focus:border-brand-500",
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-extrabold text-ink text-sm">{title}</h2>
      {description && (
        <p className="mt-0.5 text-ink-3 text-sm">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink text-sm">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-2xs text-ink-3">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p role="alert" className="mt-1 font-medium text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckboxField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-ink-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-brand-600"
      />
      <span>
        {label}
        {hint && <span className="block text-2xs text-ink-3">{hint}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-btn bg-danger-soft px-3.5 py-3 font-medium text-danger text-sm"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
      {message}
    </p>
  );
}

export function SavedNote({
  show,
  children = "Saved. Storefront pages will pick this up on their next request.",
}: {
  show: boolean;
  children?: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <p className="rounded-btn bg-success-soft px-3.5 py-3 font-medium text-success text-sm">
      {children}
    </p>
  );
}
