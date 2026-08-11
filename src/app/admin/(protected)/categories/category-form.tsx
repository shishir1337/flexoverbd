"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  CheckboxField,
  Field,
  FormError,
  inputCls,
  SavedNote,
  Section,
  textareaCls,
} from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { CATEGORY_TINTS, DEFAULT_TINT } from "@/lib/category-tints";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { saveCategory } from "@/server/services/admin/taxonomy-actions";

export type CategoryFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortName: string;
  blurb: string;
  tint: string;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
};

export const EMPTY_CATEGORY: CategoryFormValues = {
  name: "",
  slug: "",
  shortName: "",
  blurb: "",
  tint: DEFAULT_TINT,
  isActive: true,
  seoTitle: "",
  seoDescription: "",
};

/**
 * Create and edit share one form, as with products.
 *
 * `shortName` is separate from `name` because the round category scroller under
 * the header gives a label about ten characters before it truncates — "Home
 * Essentials" has to become "Home" there while staying "Home Essentials" on the
 * category page itself.
 */
export function CategoryForm({ initial }: { initial: CategoryFormValues }) {
  const router = useRouter();
  const ids = {
    name: useId(),
    slug: useId(),
    shortName: useId(),
    blurb: useId(),
    seoTitle: useId(),
    seoDescription: useId(),
  };

  const [values, setValues] = useState(initial);
  // A saved category has a URL people may already have linked to, so its slug
  // never auto-follows the name; a brand new one has nothing to break.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveCategory(values);
      if (!result.ok) {
        setFormError(result.error);
        setErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      if (!values.id && result.data) {
        router.replace(`/admin/categories/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <SavedNote show={saved} />

      <Section title="Basics">
        <Field id={ids.name} label="Name" error={errors.name}>
          <input
            id={ids.name}
            value={values.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            className={inputCls(errors.name)}
          />
        </Field>

        <Field
          id={ids.slug}
          label="Slug"
          hint="The URL: /category/<slug>. Changing it leaves a redirect behind."
          error={errors.slug}
        >
          <input
            id={ids.slug}
            value={values.slug}
            onChange={(e) => {
              set("slug", e.target.value);
              setSlugTouched(true);
            }}
            className={cn(inputCls(errors.slug), "font-mono text-sm")}
          />
        </Field>

        <Field
          id={ids.shortName}
          label="Short name"
          hint="Used in the round scroller under the header. Keep it to one word where you can."
          error={errors.shortName}
        >
          <input
            id={ids.shortName}
            value={values.shortName}
            onChange={(e) => set("shortName", e.target.value)}
            className={inputCls(errors.shortName)}
          />
        </Field>

        <Field
          id={ids.blurb}
          label="Blurb"
          hint="One line, shown at the top of the category page."
          error={errors.blurb}
        >
          <textarea
            id={ids.blurb}
            value={values.blurb}
            onChange={(e) => set("blurb", e.target.value)}
            rows={2}
            className={textareaCls(errors.blurb)}
          />
        </Field>

        <fieldset>
          <legend className="font-semibold text-ink text-sm">Tint</legend>
          <p className="mt-0.5 text-2xs text-ink-3">
            Colours the category tile and its chip.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_TINTS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("tint", t.value)}
                aria-pressed={values.tint === t.value}
                className={cn(
                  "flex items-center gap-2 rounded-btn border px-2.5 py-1.5 text-sm tap",
                  values.tint === t.value
                    ? "border-brand-500 bg-brand-soft font-semibold text-brand-on"
                    : "border-line text-ink-2 hover:border-line-strong",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 rounded-full bg-linear-to-br",
                    t.value,
                  )}
                />
                {t.label}
              </button>
            ))}
          </div>
          {errors.tint && (
            <p role="alert" className="mt-1 font-medium text-danger text-xs">
              {errors.tint}
            </p>
          )}
        </fieldset>

        <CheckboxField
          checked={values.isActive}
          onChange={(v) => set("isActive", v)}
          label="Visible on the storefront"
          hint="Uncheck to hide it from menus and listings without archiving it."
        />
      </Section>

      <Section
        title="Search engines"
        description="Leave blank to fall back to the name and blurb."
      >
        <Field id={ids.seoTitle} label="SEO title" error={errors.seoTitle}>
          <input
            id={ids.seoTitle}
            value={values.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
            className={inputCls(errors.seoTitle)}
          />
        </Field>
        <Field
          id={ids.seoDescription}
          label="SEO description"
          error={errors.seoDescription}
        >
          <textarea
            id={ids.seoDescription}
            value={values.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
            rows={3}
            className={textareaCls(errors.seoDescription)}
          />
        </Field>
      </Section>

      <Button type="submit" disabled={pending}>
        <Save aria-hidden className="size-4" />
        {pending ? "Saving…" : "Save category"}
      </Button>
    </form>
  );
}
