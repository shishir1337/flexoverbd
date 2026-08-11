"use client";

import {
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
  ImageOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Chip } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn, formatBDT } from "@/lib/utils";
import { bulkProductAction } from "@/server/services/admin/product-actions";

export type ProductRow = {
  id: string;
  title: string;
  brand: string;
  category: string;
  variantCount: number;
  totalStock: number;
  price: number;
  state: "published" | "draft" | "archived";
  /** Primary image, or null — a published product without one is a problem. */
  thumbnail: string | null;
};

/**
 * A thumbnail and, when there isn't one, the reason it matters.
 *
 * Staff recognise stock by sight long before they read a title, and scanning
 * sixty rows of text is how the wrong product gets edited. The placeholder is
 * deliberately loud on a published product: a live listing with no photograph
 * is close to unsellable, and this list is the only place that is visible
 * across the whole catalogue.
 */
function Thumb({ row, size }: { row: ProductRow; size: string }) {
  if (row.thumbnail) {
    return (
      // Plain <img>: CDN URLs already sized for a thumbnail grid.
      // biome-ignore lint/performance/noImgElement: see above.
      <img
        src={row.thumbnail}
        alt=""
        loading="lazy"
        className={cn(size, "shrink-0 rounded-btn bg-surface-2 object-cover")}
      />
    );
  }

  return (
    <span
      title={
        row.state === "published"
          ? "Published with no photo — customers see a placeholder"
          : "No photo yet"
      }
      className={cn(
        size,
        "grid shrink-0 place-items-center rounded-btn border border-dashed",
        row.state === "published"
          ? "border-danger/50 bg-danger-soft text-danger"
          : "border-line bg-surface-2 text-ink-4",
      )}
    >
      <ImageOff aria-hidden className="size-4" />
      <span className="sr-only">No photo</span>
    </span>
  );
}

const STATE = {
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "brand" },
  archived: { label: "Archived", tone: "neutral" },
} as const;

type Action = "publish" | "unpublish" | "archive" | "restore";

/**
 * The catalogue list.
 *
 * Bulk publish and archive because a catalogue moves in blocks — a season goes
 * live together and comes down together. Which actions are offered depends on
 * what is selected: archiving an already-archived product is a no-op, and
 * offering it just invites a click that appears to do nothing.
 */
export function ProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;
  const chosen = products.filter((p) => selected.has(p.id));

  const anyArchived = chosen.some((p) => p.state === "archived");
  const anyLive = chosen.some((p) => p.state === "published");
  const anyNotLive = chosen.some((p) => p.state !== "published");

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply(action: Action) {
    const verb = {
      publish: "Publish",
      unpublish: "Unpublish",
      archive: "Archive",
      restore: "Restore",
    }[action];

    if (action === "archive" || action === "unpublish") {
      const ok = await confirm({
        title: `${verb} ${chosen.length} ${chosen.length === 1 ? "product" : "products"}?`,
        body:
          action === "archive"
            ? "They come off the storefront but keep their URLs and stay on past orders. You can restore them later."
            : "They come off the storefront but stay in the catalogue as drafts.",
        confirmLabel: verb,
        destructive: action === "archive",
      });
      if (!ok) return;
    }

    startTransition(async () => {
      const result = await bulkProductAction({
        ids: chosen.map((p) => p.id),
        action,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setSelected(new Set());
      const changed = result.data?.changed ?? 0;
      // Say so when part of the selection was left behind, rather than
      // reporting a clean success for a job that only half happened.
      const skipped = result.data?.skipped ?? 0;
      toast({
        tone: skipped > 0 ? "info" : "success",
        message:
          `${changed} ${changed === 1 ? "product" : "products"} updated.` +
          (skipped > 0
            ? ` ${skipped} skipped — ${
                skipped === 1 ? "it still needs" : "they still need"
              } a title and a price.`
            : ""),
      });
      router.refresh();
    });
  }

  const actions: { key: Action; label: string; icon: typeof Eye }[] = [
    ...(anyNotLive && !anyArchived
      ? [{ key: "publish" as const, label: "Publish", icon: Eye }]
      : []),
    ...(anyLive
      ? [{ key: "unpublish" as const, label: "Unpublish", icon: EyeOff }]
      : []),
    ...(anyArchived
      ? [{ key: "restore" as const, label: "Restore", icon: ArchiveRestore }]
      : [{ key: "archive" as const, label: "Archive", icon: Archive }]),
  ];

  return (
    <div>
      {dialog}

      {selected.size > 0 && (
        <div className="sticky bottom-3 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-card border border-brand-200 bg-brand-soft p-2.5 shadow-card-hover">
          <span className="px-1 font-semibold text-brand-on text-sm tnum">
            {selected.size} selected
          </span>

          {actions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => apply(key)}
              disabled={pending}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-btn px-3 font-semibold text-sm tap disabled:opacity-40",
                key === "archive"
                  ? "border border-danger text-danger hover:bg-danger-soft"
                  : "bg-brand-600 text-white hover:bg-brand-700",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className={adminButton("ghost", "icon", "ml-auto")}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-line border-b bg-surface-2 text-left">
            <tr className="text-ink-3 text-xs uppercase tracking-wide">
              <th className="w-10 px-3 py-3">
                <input
                  // `indeterminate` has no attribute form; it has to be set on
                  // the DOM node, and it is what shows a partial selection.
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(products.map((p) => p.id)),
                    )
                  }
                  aria-label="Select all products on this page"
                  className="size-4 accent-brand-600"
                />
              </th>
              <th className="px-4 py-3 font-bold">Product</th>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Stock</th>
              <th className="px-4 py-3 text-right font-bold">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr
                key={p.id}
                className={cn(
                  "hover:bg-surface-2",
                  selected.has(p.id) && "bg-brand-soft/40",
                )}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.title}`}
                    className="size-4 accent-brand-600"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Thumb row={p} size="size-10" />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-semibold text-ink hover:text-brand-on"
                      >
                        {p.title}
                      </Link>
                      <span className="block text-2xs text-ink-3">
                        {p.brand} · {p.variantCount}{" "}
                        {p.variantCount === 1 ? "variant" : "variants"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2">{p.category}</td>
                <td className="px-4 py-3">
                  <Chip tone={STATE[p.state].tone}>{STATE[p.state].label}</Chip>
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold tnum",
                    p.totalStock === 0 ? "text-danger" : "text-ink",
                  )}
                >
                  {p.totalStock}
                </td>
                <td className="px-4 py-3 text-right font-bold text-ink tnum">
                  {formatBDT(p.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {products.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-card border bg-surface p-3",
              selected.has(p.id)
                ? "border-brand-500 bg-brand-soft/40"
                : "border-line",
            )}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                aria-label={`Select ${p.title}`}
                className="mt-1 size-4 shrink-0 accent-brand-600"
              />
              <Thumb row={p} size="size-11" />
              <Link
                href={`/admin/products/${p.id}`}
                className="min-w-0 flex-1 tap"
              >
                <span className="block truncate font-semibold text-ink text-sm">
                  {p.title}
                </span>
                <span className="mt-0.5 block truncate text-2xs text-ink-3">
                  {p.category} · {p.brand}
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <Chip tone={STATE[p.state].tone}>{STATE[p.state].label}</Chip>
                  <span
                    className={cn(
                      "text-2xs tnum",
                      p.totalStock === 0 ? "text-danger" : "text-ink-3",
                    )}
                  >
                    {p.totalStock} in stock
                  </span>
                </span>
              </Link>
              <span className="shrink-0 font-bold text-ink text-sm tnum">
                {formatBDT(p.price)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
