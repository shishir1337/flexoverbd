"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  Field,
  FormError,
  inputCls,
  SavedNote,
  Section,
} from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { saveProduct } from "@/server/services/admin/product-actions";

type CategoryOption = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

/**
 * The form's own shape: numeric fields are strings while being typed, because
 * an <input type="number"> is empty-string mid-edit and coercing on every
 * keystroke fights the user. They are converted once, on submit.
 */
export type ProductFormValues = {
  id?: string;
  title: string;
  slug: string;
  brandId: string | null;
  categoryId: string;
  subcategoryId: string | null;
  description: string | null;
  price: string;
  compareAt: string;
  badge: "NEW" | "BESTSELLER" | "LIMITED" | "RESTOCK" | null;
  freeDelivery: boolean;
  tags: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isActive: boolean;
  isPublished: boolean;
};

/**
 * Create and edit share one form.
 *
 * Validation lives on the server — this only surfaces what comes back. Two
 * checks in particular are server-side on purpose: slug uniqueness (a race
 * between two admins would beat any client check) and compare-at being higher
 * than the price (a rule the storefront's discount badge depends on).
 */
export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const ids = {
    title: useId(),
    slug: useId(),
    brand: useId(),
    category: useId(),
    subcategory: useId(),
    description: useId(),
    price: useId(),
    compareAt: useId(),
    badge: useId(),
    tags: useId(),
    seoTitle: useId(),
    seoDescription: useId(),
  };

  const [values, setValues] = useState<ProductFormValues>(initial);
  /**
   * Whether the slug is the operator's to own.
   *
   * Seeded from whether one already exists: on a new product the slug follows
   * the title until someone edits it, but on an existing product a retitle must
   * never silently move a live URL that already has links pointing at it.
   */
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  const subcategories =
    categories.find((c) => c.id === values.categoryId)?.subcategories ?? [];

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await saveProduct({
        ...values,
        price: values.price === "" ? 0 : Number(values.price),
        compareAt: values.compareAt === "" ? null : Number(values.compareAt),
      });
      if (!result.ok) {
        setFormError(result.error);
        setErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      if (!values.id && result.data) {
        // A new product needs a real URL, or a refresh loses the work.
        router.replace(`/admin/products/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <SavedNote show={saved} />

      <Section title="Basics">
        <Field id={ids.title} label="Title" error={errors.title}>
          <input
            id={ids.title}
            value={values.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            className={inputCls(errors.title)}
          />
        </Field>

        <Field
          id={ids.slug}
          label="Slug"
          hint="Changing this leaves a redirect behind, so old links keep working."
          error={errors.slug}
        >
          <input
            id={ids.slug}
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            // Tidied on the way out rather than per keystroke, so typing a
            // space does not yank the caret across a dash mid-word. An empty
            // slug falls back to the title instead of failing validation.
            onBlur={(e) =>
              set("slug", slugify(e.target.value) || slugify(values.title))
            }
            placeholder={slugify(values.title) || "auto-from-title"}
            className={cn(inputCls(errors.slug), "font-mono text-sm")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.category} label="Category" error={errors.categoryId}>
            <select
              id={ids.category}
              value={values.categoryId}
              onChange={(e) => {
                set("categoryId", e.target.value);
                set("subcategoryId", null);
              }}
              className={inputCls(errors.categoryId)}
            >
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field id={ids.subcategory} label="Subcategory">
            <select
              id={ids.subcategory}
              value={values.subcategoryId ?? ""}
              onChange={(e) => set("subcategoryId", e.target.value || null)}
              disabled={subcategories.length === 0}
              className={inputCls()}
            >
              <option value="">None</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field id={ids.brand} label="Brand">
          <select
            id={ids.brand}
            value={values.brandId ?? ""}
            onChange={(e) => set("brandId", e.target.value || null)}
            className={inputCls()}
          >
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id={ids.description}
          label="Description"
          hint="Leave blank to use the category copy template."
        >
          <textarea
            id={ids.description}
            value={values.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            rows={4}
            className={inputCls()}
          />
        </Field>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.price} label="Price (৳)" error={errors.price}>
            <input
              id={ids.price}
              type="number"
              inputMode="numeric"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              className={cn(inputCls(errors.price), "tnum")}
            />
          </Field>
          <Field
            id={ids.compareAt}
            label="Compare-at (৳)"
            hint="Shown struck through. Must be higher than the price."
            error={errors.compareAt}
          >
            <input
              id={ids.compareAt}
              type="number"
              inputMode="numeric"
              value={values.compareAt}
              onChange={(e) => set("compareAt", e.target.value)}
              className={cn(inputCls(errors.compareAt), "tnum")}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-ink-2 text-sm">
          <input
            type="checkbox"
            checked={values.freeDelivery}
            onChange={(e) => set("freeDelivery", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand-600"
          />
          <span>
            Free delivery on this item
            <span className="block text-2xs text-ink-3">
              Ships free regardless of order value — checkout honours this.
            </span>
          </span>
        </label>
      </Section>

      <Section title="Merchandising">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.badge} label="Badge">
            <select
              id={ids.badge}
              value={values.badge ?? ""}
              onChange={(e) =>
                set(
                  "badge",
                  (e.target.value || null) as ProductFormValues["badge"],
                )
              }
              className={inputCls()}
            >
              <option value="">None</option>
              <option value="NEW">New</option>
              <option value="BESTSELLER">Bestseller</option>
              <option value="LIMITED">Limited</option>
              <option value="RESTOCK">Back in stock</option>
            </select>
          </Field>
          <Field id={ids.tags} label="Tags" hint="Comma separated.">
            <input
              id={ids.tags}
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </div>
      </Section>

      <Section title="SEO">
        <Field
          id={ids.seoTitle}
          label="Meta title"
          hint="Blank uses the product title. Keep under 70 characters."
          error={errors.seoTitle}
        >
          <input
            id={ids.seoTitle}
            value={values.seoTitle ?? ""}
            onChange={(e) => set("seoTitle", e.target.value || null)}
            className={inputCls(errors.seoTitle)}
          />
        </Field>
        <Field
          id={ids.seoDescription}
          label="Meta description"
          hint="Blank uses the product description. Keep under 180 characters."
          error={errors.seoDescription}
        >
          <textarea
            id={ids.seoDescription}
            value={values.seoDescription ?? ""}
            onChange={(e) => set("seoDescription", e.target.value || null)}
            rows={2}
            className={inputCls(errors.seoDescription)}
          />
        </Field>
      </Section>

      <Section title="Visibility">
        <label className="flex cursor-pointer items-start gap-2.5 text-ink-2 text-sm">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand-600"
          />
          <span>
            Published
            <span className="block text-2xs text-ink-3">
              Unpublished products are hidden from the storefront and the
              sitemap.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-ink-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand-600"
          />
          <span>Active</span>
        </label>
      </Section>

      <div className="sticky bottom-0 flex gap-2.5 border-line border-t bg-surface-2 py-3">
        <Button type="submit" size="lg" disabled={pending}>
          <Save aria-hidden className="size-4.5" />
          {pending ? "Saving…" : "Save product"}
        </Button>
      </div>
    </form>
  );
}
