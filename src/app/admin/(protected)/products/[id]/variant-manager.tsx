"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Grid3x3,
  Layers,
  Palette,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { inputCls } from "@/components/admin/form";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { cn, formatBDT } from "@/lib/utils";
import { adjustStock } from "@/server/services/admin/product-actions";
import {
  createVariant,
  deleteVariant,
  reorderVariants,
  updateVariant,
} from "@/server/services/admin/variant-actions";
import { VariantGenerator } from "./variant-generator";

export type ManagedVariant = {
  id: string;
  sku: string;
  colourName: string | null;
  colourHex: string | null;
  sizeValue: string | null;
  sizeLabel: string | null;
  sizeSystem: "APPAREL" | "FOOTWEAR" | "ONESIZE" | null;
  priceOverride: number | null;
  stock: number;
  isActive: boolean;
};

type Draft = {
  sku: string;
  colourName: string;
  colourHex: string;
  sizeValue: string;
  sizeLabel: string;
  sizeSystem: "" | "APPAREL" | "FOOTWEAR" | "ONESIZE";
  priceOverride: string;
  isActive: boolean;
};

const BLANK: Draft = {
  sku: "",
  colourName: "",
  colourHex: "",
  sizeValue: "",
  sizeLabel: "",
  sizeSystem: "",
  priceOverride: "",
  isActive: true,
};

function toDraft(v: ManagedVariant): Draft {
  return {
    sku: v.sku,
    colourName: v.colourName ?? "",
    colourHex: v.colourHex ?? "",
    sizeValue: v.sizeValue ?? "",
    sizeLabel: v.sizeLabel ?? "",
    sizeSystem: v.sizeSystem ?? "",
    priceOverride: v.priceOverride === null ? "" : String(v.priceOverride),
    isActive: v.isActive,
  };
}

function label(v: { colourName: string | null; sizeValue: string | null }) {
  return [v.colourName, v.sizeValue].filter(Boolean).join(" · ") || "Default";
}

/**
 * Variants and stock in one place.
 *
 * These used to be two ideas — a read-only variant list and a stock editor —
 * which meant the only way to create the thing a customer buys was to edit the
 * seed script. They are one card now because they are one mental object: the
 * row on the shelf, its SKU, its price and how many are left.
 *
 * Stock keeps its own control and its own save, separate from the edit form.
 * Counting a shelf and renaming a colour are different jobs done at different
 * times, and folding stock into the edit form would mean opening a form —
 * risking an accidental SKU change — every time someone counts.
 */
export function VariantManager({
  productId,
  basePrice,
  variants,
}: {
  productId: string;
  /** The product price a variant inherits when it has no override. */
  basePrice: number;
  variants: ManagedVariant[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savedStockId, setSavedStockId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  // Derived from props, with only the optimistic order held locally — a
  // useState seeded from props would hide a variant created seconds ago.
  const ordered = pendingOrder
    ? [...variants].sort(
        (a, b) => pendingOrder.indexOf(a.id) - pendingOrder.indexOf(b.id),
      )
    : variants;

  const live = ordered.filter((v) => v.isActive).length;
  const outOfStock = ordered.filter((v) => v.isActive && v.stock === 0).length;

  function openAdd() {
    setEditingId(null);
    setFormError(null);
    setDraft(BLANK);
    setAdding(true);
  }

  function openEdit(v: ManagedVariant) {
    setAdding(false);
    setFormError(null);
    setDraft(toDraft(v));
    setEditingId(v.id);
  }

  function closeForm() {
    setAdding(false);
    setEditingId(null);
    setFormError(null);
  }

  function submit() {
    setFormError(null);
    const payload = {
      ...draft,
      sizeSystem: draft.sizeSystem || null,
      colourHex: draft.colourHex || null,
    };

    startTransition(async () => {
      const result = editingId
        ? await updateVariant({ ...payload, id: editingId })
        : await createVariant({ ...payload, productId, stock: 0 });

      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast({
        tone: "success",
        message: editingId ? "Variant updated." : "Variant added.",
      });
      closeForm();
      setPendingOrder(null);
      router.refresh();
    });
  }

  function saveStock(v: ManagedVariant) {
    const raw = stockDrafts[v.id];
    if (raw === undefined || raw === "") return;

    startTransition(async () => {
      const result = await adjustStock({ variantId: v.id, newStock: +raw });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setStockDrafts((d) => {
        const next = { ...d };
        delete next[v.id];
        return next;
      });
      setSavedStockId(v.id);
      router.refresh();
    });
  }

  function move(index: number, delta: number) {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const order = next.map((v) => v.id);
    setPendingOrder(order);

    startTransition(async () => {
      const result = await reorderVariants({ productId, variantIds: order });
      if (!result.ok) {
        setPendingOrder(null);
        toast({ tone: "error", message: result.error });
        return;
      }
      router.refresh();
    });
  }

  async function remove(v: ManagedVariant) {
    const ok = await confirm({
      title: `Delete ${label(v)}?`,
      body: `SKU ${v.sku} and its stock history go with it. If this has ever been sold, turn it off instead.`,
      confirmLabel: "Delete variant",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteVariant({ id: v.id });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setPendingOrder(null);
      toast({ tone: "success", message: "Variant deleted." });
      router.refresh();
    });
  }

  function toggleActive(v: ManagedVariant) {
    startTransition(async () => {
      const result = await updateVariant({
        ...toDraft(v),
        sizeSystem: v.sizeSystem,
        colourHex: v.colourHex,
        priceOverride: v.priceOverride === null ? "" : v.priceOverride,
        id: v.id,
        isActive: !v.isActive,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface shadow-xs">
      {dialog}
      <VariantGenerator
        open={generating}
        productId={productId}
        onClose={() => setGenerating(false)}
        onDone={() => {
          setGenerating(false);
          setPendingOrder(null);
          router.refresh();
        }}
      />

      <header className="flex flex-wrap items-center justify-between gap-2 border-line border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-bold text-ink text-sm">
            Variants &amp; stock ({ordered.length})
          </h2>
          <p className="mt-0.5 text-ink-3 text-xs">
            {ordered.length === 0
              ? "A product with no variants cannot be added to a cart."
              : `${live} on sale${outOfStock > 0 ? `, ${outOfStock} out of stock` : ""}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <AdminButton onClick={() => setGenerating(true)}>
            <Grid3x3 aria-hidden className="size-4" />
            Generate
          </AdminButton>
          <AdminButton variant="primary" onClick={openAdd}>
            <Plus aria-hidden className="size-4" />
            Add variant
          </AdminButton>
        </div>
      </header>

      {ordered.length === 0 && !adding ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={Layers}
            title="No variants yet"
            body="Every product needs at least one — it is what carries the SKU, the stock count and the price. Generate a colour × size grid, or add a single default variant."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AdminButton variant="primary" onClick={openAdd}>
                  <Plus aria-hidden className="size-4" />
                  Add one variant
                </AdminButton>
                <AdminButton onClick={() => setGenerating(true)}>
                  <Grid3x3 aria-hidden className="size-4" />
                  Generate a grid
                </AdminButton>
              </div>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {ordered.map((v, index) => {
            const stockDraft = stockDrafts[v.id];
            const dirty =
              stockDraft !== undefined && stockDraft !== String(v.stock);

            if (editingId === v.id) {
              return (
                <li key={v.id} className="bg-surface-2 px-4 py-4 sm:px-5">
                  <VariantForm
                    draft={draft}
                    setDraft={setDraft}
                    basePrice={basePrice}
                    error={formError}
                    pending={pending}
                    submitLabel="Save changes"
                    onSubmit={submit}
                    onCancel={closeForm}
                  />
                </li>
              );
            }

            return (
              <li
                key={v.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors sm:px-5",
                  !v.isActive && "bg-surface-2/60",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="size-6 shrink-0 rounded-full border border-line"
                    style={{
                      background: v.colourHex ?? "var(--color-surface-3)",
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate font-semibold text-sm",
                        v.isActive ? "text-ink" : "text-ink-3",
                      )}
                    >
                      {label(v)}
                      {!v.isActive && (
                        <span className="ml-1.5 rounded-chip bg-surface-3 px-1.5 py-0.5 font-semibold text-2xs text-ink-3">
                          Off
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-2xs text-ink-3 wrap-anywhere">
                      {v.sku}
                      {v.priceOverride !== null && (
                        <span className="ml-1.5 font-sans font-semibold text-brand-on">
                          {formatBDT(v.priceOverride)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="sr-only" htmlFor={`stock-${v.id}`}>
                    Stock for {v.sku}
                  </label>
                  <input
                    id={`stock-${v.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={stockDraft ?? String(v.stock)}
                    onChange={(e) =>
                      setStockDrafts((d) => ({ ...d, [v.id]: e.target.value }))
                    }
                    className={cn(
                      "h-9 w-20 rounded-btn border bg-surface px-2.5 text-base text-ink tnum focus:border-brand-500 focus:outline-none",
                      v.stock === 0 && v.isActive
                        ? "border-danger"
                        : "border-line",
                    )}
                  />
                  <AdminButton
                    variant={dirty ? "primary" : "ghost"}
                    size="icon-sm"
                    disabled={!dirty || pending}
                    onClick={() => saveStock(v)}
                    aria-label={`Save stock for ${v.sku}`}
                  >
                    <Check aria-hidden className="size-4" />
                  </AdminButton>
                  {savedStockId === v.id && !dirty && (
                    <span className="font-semibold text-2xs text-success">
                      Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <AdminButton
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0 || pending}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp aria-hidden className="size-3.5" />
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === ordered.length - 1 || pending}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown aria-hidden className="size-3.5" />
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    onClick={() => toggleActive(v)}
                    aria-label={
                      v.isActive
                        ? `Take ${label(v)} off sale`
                        : `Put ${label(v)} on sale`
                    }
                    title={v.isActive ? "On sale" : "Off sale"}
                  >
                    {/* Not a tick: the button beside it saves stock and a
                        second identical tick would be a coin flip. Visibility
                        is what this actually controls. */}
                    {v.isActive ? (
                      <Eye aria-hidden className="size-3.5 text-success" />
                    ) : (
                      <EyeOff aria-hidden className="size-3.5" />
                    )}
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(v)}
                    aria-label={`Edit ${label(v)}`}
                  >
                    <Pencil aria-hidden className="size-3.5" />
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    onClick={() => remove(v)}
                    aria-label={`Delete ${label(v)}`}
                    className="hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </AdminButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="border-line border-t bg-surface-2 px-4 py-4 sm:px-5">
          <VariantForm
            draft={draft}
            setDraft={setDraft}
            basePrice={basePrice}
            error={formError}
            pending={pending}
            submitLabel="Add variant"
            onSubmit={submit}
            onCancel={closeForm}
          />
        </div>
      )}
    </section>
  );
}

const SIZE_SYSTEMS = [
  { value: "", label: "Not sized" },
  { value: "APPAREL", label: "Apparel (S, M, L)" },
  { value: "FOOTWEAR", label: "Footwear (38, 39, 40)" },
  { value: "ONESIZE", label: "One size" },
] as const;

function VariantForm({
  draft,
  setDraft,
  basePrice,
  error,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  basePrice: number;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      {error && (
        <p
          role="alert"
          className="rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SmallField id="v-sku" label="SKU" hint="Letters, numbers, dashes.">
          <input
            id="v-sku"
            value={draft.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="SHIRT-NAVY-M"
            required
            className={cn(inputCls(), "font-mono")}
          />
        </SmallField>

        <SmallField
          id="v-price"
          label="Price override"
          hint={`Blank inherits ${formatBDT(basePrice)}.`}
        >
          <input
            id="v-price"
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.priceOverride}
            onChange={(e) => set("priceOverride", e.target.value)}
            placeholder={String(basePrice)}
            className={cn(inputCls(), "tnum")}
          />
        </SmallField>

        <SmallField
          id="v-colour"
          label="Colour"
          hint={
            draft.colourHex
              ? `Swatch ${draft.colourHex} — shown as a dot on the product page.`
              : "No swatch yet. Pick one to show a colour dot."
          }
        >
          <div className="flex gap-2">
            <input
              id="v-colour"
              value={draft.colourName}
              onChange={(e) => set("colourName", e.target.value)}
              placeholder="Navy"
              className={inputCls()}
            />
            {/* An untouched colour input renders black, which reads as "black
                is selected" when nothing is. The unset state gets its own
                neutral tile, and a swatch that is set can be cleared. */}
            {draft.colourHex ? (
              <div className="flex shrink-0 gap-1">
                <input
                  type="color"
                  value={draft.colourHex}
                  onChange={(e) => set("colourHex", e.target.value)}
                  aria-label="Colour swatch"
                  className="h-11 w-12 cursor-pointer rounded-btn border border-line bg-surface p-1"
                />
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => set("colourHex", "")}
                  aria-label="Remove the colour swatch"
                >
                  <X aria-hidden className="size-4" />
                </AdminButton>
              </div>
            ) : (
              <label className="relative h-11 w-12 shrink-0 cursor-pointer rounded-btn border border-line border-dashed bg-surface-2">
                <span className="sr-only">Pick a colour swatch</span>
                <Palette
                  aria-hidden
                  className="-translate-1/2 absolute top-1/2 left-1/2 size-4 text-ink-4"
                />
                <input
                  type="color"
                  value="#808080"
                  onChange={(e) => set("colourHex", e.target.value)}
                  className="size-full cursor-pointer opacity-0"
                />
              </label>
            )}
          </div>
        </SmallField>

        <SmallField id="v-size" label="Size" hint="Leave blank if unsized.">
          <div className="flex gap-2">
            <input
              id="v-size"
              value={draft.sizeValue}
              onChange={(e) => set("sizeValue", e.target.value)}
              placeholder="M"
              className={inputCls()}
            />
            <select
              value={draft.sizeSystem}
              onChange={(e) =>
                set("sizeSystem", e.target.value as Draft["sizeSystem"])
              }
              aria-label="Size system"
              className={cn(inputCls(), "w-40 shrink-0")}
            >
              {SIZE_SYSTEMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </SmallField>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-ink-2 text-sm">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="size-4 shrink-0 accent-brand-600"
        />
        On sale — customers can pick this option
      </label>

      <div className="flex gap-2">
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </AdminButton>
        <AdminButton type="button" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

function SmallField({
  id,
  label: text,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink text-xs">
        {text}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-2xs text-ink-3">{hint}</p>}
    </div>
  );
}
