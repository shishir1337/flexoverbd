"use client";

import { AlertCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type SettingsGroup,
  saveSettings,
} from "@/server/services/admin/settings-actions";

export type FieldSpec = {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "number" | "textarea" | "checkbox";
};

/**
 * One form component for every settings group.
 *
 * The groups differ only in which fields they render, so a generic form beats
 * six near-identical ones — and it means a new setting is a row in a spec array
 * rather than a new screen.
 */
export function SettingsForm({
  group,
  title,
  description,
  fields,
  initial,
}: {
  group: SettingsGroup;
  title: string;
  description?: string;
  fields: FieldSpec[];
  initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const baseId = useId();
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveSettings(group, values);
      if (!result.ok) {
        setFormError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface p-4 sm:p-5"
    >
      <h2 className="font-extrabold text-ink">{title}</h2>
      {description && (
        <p className="mt-0.5 text-ink-3 text-sm">{description}</p>
      )}

      {formError && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      )}
      {saved && (
        <p className="mt-3 rounded-btn bg-success-soft px-3 py-2 font-medium text-success text-sm">
          Saved.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {fields.map((f) => {
          const id = `${baseId}-${f.key}`;
          const value = values[f.key];
          const error = errors[f.key];

          if (f.type === "checkbox") {
            return (
              <label
                key={f.key}
                className="flex cursor-pointer items-start gap-2.5 text-ink-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [f.key]: e.target.checked }));
                    setSaved(false);
                  }}
                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                />
                <span>
                  {f.label}
                  {f.hint && (
                    <span className="block text-2xs text-ink-3">{f.hint}</span>
                  )}
                </span>
              </label>
            );
          }

          const common = {
            id,
            value: value === null || value === undefined ? "" : String(value),
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              setValues((v) => ({ ...v, [f.key]: e.target.value }));
              setSaved(false);
            },
            className: cn(
              "w-full rounded-btn border bg-surface px-3 text-base text-ink focus:outline-none",
              f.type === "textarea" ? "py-2" : "h-10",
              f.type === "number" && "tnum",
              error ? "border-danger" : "border-line focus:border-brand-500",
            ),
          };

          return (
            <div key={f.key}>
              <label
                htmlFor={id}
                className="block font-semibold text-ink text-sm"
              >
                {f.label}
              </label>
              {f.hint && <p className="mt-0.5 text-2xs text-ink-3">{f.hint}</p>}
              <div className="mt-1.5">
                {f.type === "textarea" ? (
                  <textarea {...common} rows={3} />
                ) : (
                  <input
                    {...common}
                    type={f.type === "number" ? "number" : "text"}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                  />
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-1 font-medium text-danger text-xs"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={pending} className="mt-5">
        <Save aria-hidden className="size-4" />
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
