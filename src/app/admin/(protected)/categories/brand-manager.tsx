"use client";

import { AlertCircle, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import type { AdminBrandRow } from "@/server/services/admin/taxonomy";
import {
  deleteBrand,
  saveBrand,
} from "@/server/services/admin/taxonomy-actions";

/**
 * Brands.
 *
 * A brand is two fields, so a full page per brand would be ceremony. Editing
 * happens inline: the row turns into inputs and back. Deletion is only offered
 * when nothing references the brand — the action refuses otherwise, and the
 * count is shown so it is obvious why.
 */
export function BrandManager({ initial }: { initial: AdminBrandRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin(brand?: AdminBrandRow) {
    setError(null);
    setSlugTouched(Boolean(brand));
    setName(brand?.name ?? "");
    setSlug(brand?.slug ?? "");
    setEditingId(brand?.id ?? null);
    setCreating(!brand);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveBrand({
        id: editingId ?? undefined,
        name,
        slug,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.slug ?? result.error);
        return;
      }
      cancel();
      router.refresh();
    });
  }

  async function remove(brand: AdminBrandRow) {
    const ok = await confirm({
      title: `Delete ${brand.name}?`,
      body: "Nothing links to a brand page, so this is a real delete rather than an archive.",
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBrand(brand.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: `${brand.name} deleted.` });
      router.refresh();
    });
  }

  const editor = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1">
        <label htmlFor="brand-name" className="block text-2xs text-ink-3">
          Name
        </label>
        <input
          id="brand-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // The slug follows the name until someone edits it by hand, then
            // it stops — a deliberate URL should not be overwritten by typing.
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="min-w-40 flex-1">
        <label htmlFor="brand-slug" className="block text-2xs text-ink-3">
          Slug
        </label>
        <input
          id="brand-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !name.trim()}
        className={adminButton("primary", "md", "shrink-0")}
      >
        <Check aria-hidden className="size-4" />
        Save
      </button>
      <button
        type="button"
        onClick={cancel}
        className={adminButton("secondary", "icon", "shrink-0")}
        aria-label="Cancel"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-ink">Brands</h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            Shown on product cards and the product page.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary")}
          >
            <Plus aria-hidden className="size-4" />
            Add brand
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {creating && (
        <div className="mt-3 rounded-btn border border-brand-200 bg-brand-soft p-3">
          {editor}
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {initial.map((brand) => (
          <li key={brand.id} className="py-2.5">
            {editingId === brand.id && !creating ? (
              editor
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink text-sm">
                    {brand.name}
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    /{brand.slug} · {brand.productCount}{" "}
                    {brand.productCount === 1 ? "product" : "products"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => begin(brand)}
                  aria-label={`Edit ${brand.name}`}
                  className={adminButton("ghost", "icon", "shrink-0")}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(brand)}
                  disabled={pending || brand.productCount > 0}
                  aria-label={`Delete ${brand.name}`}
                  title={
                    brand.productCount > 0
                      ? "Reassign its products first"
                      : undefined
                  }
                  className="grid size-9 shrink-0 place-items-center rounded-btn text-ink-3 tap hover:bg-danger-soft hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-3"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {initial.length === 0 && !creating && (
          <li className="py-2">
            <EmptyState
              icon={Tag}
              title="No brands yet"
              body="Add one to show a maker's name on product cards and the product page."
            />
          </li>
        )}
      </ul>
    </section>
  );
}
