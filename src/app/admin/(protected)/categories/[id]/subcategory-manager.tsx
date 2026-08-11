"use client";

import { ArchiveRestore, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckboxField, FormError } from "@/components/admin/form";
import { adminButton } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { AdminCategoryDetail } from "@/server/services/admin/taxonomy";
import {
  saveSubcategory,
  setSubcategoryArchived,
} from "@/server/services/admin/taxonomy-actions";

type Sub = AdminCategoryDetail["subcategories"][number];

/**
 * Subcategories, edited inline on the category page.
 *
 * They only exist in the context of their parent, and a subcategory is three
 * fields — sending someone to a separate route to change a name would be a
 * page load for a rename. Archiving is refused server-side while products
 * still point at it, so the button here does not need to guess.
 */
export function SubcategoryManager({
  categoryId,
  categorySlug,
  subcategories,
}: {
  categoryId: string;
  categorySlug: string;
  subcategories: Sub[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", isActive: true });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = subcategories.filter((s) => !s.isArchived);
  const archived = subcategories.filter((s) => s.isArchived);

  function begin(sub?: Sub) {
    setError(null);
    setSlugTouched(Boolean(sub));
    setDraft({
      name: sub?.name ?? "",
      slug: sub?.slug ?? "",
      isActive: sub?.isActive ?? true,
    });
    setEditingId(sub?.id ?? null);
    setCreating(!sub);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveSubcategory({
        id: creating ? undefined : (editingId ?? undefined),
        categoryId,
        ...draft,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.slug ?? result.error);
        return;
      }
      cancel();
      router.refresh();
    });
  }

  function toggleArchive(sub: Sub) {
    setError(null);
    startTransition(async () => {
      const result = await setSubcategoryArchived({
        id: sub.id,
        archived: !sub.isArchived,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const editor = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label htmlFor="sub-name" className="block text-2xs text-ink-3">
            Name
          </label>
          <input
            id="sub-name"
            value={draft.name}
            onChange={(e) => {
              const name = e.target.value;
              setDraft((d) => ({
                ...d,
                name,
                slug: slugTouched ? d.slug : slugify(name),
              }));
            }}
            className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="sub-slug" className="block text-2xs text-ink-3">
            Slug
          </label>
          <input
            id="sub-slug"
            value={draft.slug}
            onChange={(e) => {
              setDraft((d) => ({ ...d, slug: e.target.value }));
              setSlugTouched(true);
            }}
            className="h-10 w-full rounded-btn border border-line bg-surface px-3 font-mono text-ink text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !draft.name.trim()}
          className={adminButton("primary", "md", "shrink-0")}
        >
          <Check aria-hidden className="size-4" />
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className={adminButton("secondary", "icon", "shrink-0")}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <p className="text-2xs text-ink-4">
        /category/{categorySlug}/{draft.slug || "…"}
      </p>
      <CheckboxField
        checked={draft.isActive}
        onChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
        label="Visible on the storefront"
      />
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-ink text-sm">Subcategories</h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            The filter chips on the category page.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary")}
          >
            <Plus aria-hidden className="size-4" />
            Add
          </button>
        )}
      </div>

      <div className="mt-3">
        <FormError message={error} />
      </div>

      {creating && (
        <div className="mt-3 rounded-btn border border-brand-200 bg-brand-soft p-3">
          {editor}
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {active.map((sub) => (
          <li key={sub.id} className="py-2.5">
            {editingId === sub.id && !creating ? (
              editor
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink text-sm">
                    {sub.name}
                    {!sub.isActive && (
                      <span className="ml-2 rounded-chip bg-surface-2 px-1.5 py-0.5 font-medium text-2xs text-ink-3">
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    /{sub.slug} · {sub.productCount}{" "}
                    {sub.productCount === 1 ? "product" : "products"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => begin(sub)}
                  aria-label={`Edit ${sub.name}`}
                  className={adminButton("ghost", "icon", "shrink-0")}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleArchive(sub)}
                  disabled={pending}
                  aria-label={`Archive ${sub.name}`}
                  className="grid size-9 shrink-0 place-items-center rounded-btn text-ink-3 tap hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {active.length === 0 && !creating && (
          <li className="py-4 text-center text-ink-3 text-sm">
            No subcategories yet.
          </li>
        )}
      </ul>

      {archived.length > 0 && (
        <div className="mt-4 border-line border-t pt-3">
          <h3 className="font-semibold text-ink-3 text-2xs uppercase tracking-wide">
            Archived
          </h3>
          <ul className="mt-2 space-y-1.5">
            {archived.map((sub) => (
              <li
                key={sub.id}
                className={cn(
                  "flex items-center gap-2 rounded-btn border border-line border-dashed px-3 py-2",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-ink-3 text-sm">
                  {sub.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleArchive(sub)}
                  disabled={pending}
                  className="flex h-8 items-center gap-1.5 rounded-btn border border-line px-2.5 font-semibold text-ink-2 text-xs tap disabled:opacity-40"
                >
                  <ArchiveRestore aria-hidden className="size-3.5" />
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
