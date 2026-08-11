"use client";

import { Grid3x3, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { inputCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { generateVariants } from "@/server/services/admin/variant-actions";

/** Presets, because typing "S M L XL XXL" for every shirt is the whole problem. */
const PRESETS = [
  { label: "S–XXL", system: "APPAREL", values: ["S", "M", "L", "XL", "XXL"] },
  { label: "M–XL", system: "APPAREL", values: ["M", "L", "XL"] },
  {
    label: "Shoes 38–44",
    system: "FOOTWEAR",
    values: ["38", "39", "40", "41", "42", "43", "44"],
  },
] as const;

/**
 * Build a colour × size grid in one go.
 *
 * The count is shown before anything is written, because "18 variants" is the
 * difference between a useful shortcut and an accident someone has to delete
 * one row at a time. Combinations that already exist are skipped, so this is
 * also the way to add a seventh colour to a product that has six.
 */
export function VariantGenerator({
  open,
  productId,
  onClose,
  onDone,
}: {
  open: boolean;
  productId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toast = useToast();

  const [colours, setColours] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [system, setSystem] = useState<"APPAREL" | "FOOTWEAR" | "ONESIZE" | "">(
    "",
  );
  const [stock, setStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setColours([]);
      setSizes([]);
      setSystem("");
      setStock("0");
      setError(null);
    }
    if (!open && el.open) el.close();
  }, [open]);

  const total = Math.max(colours.length, 1) * Math.max(sizes.length, 1);
  const nothing = colours.length === 0 && sizes.length === 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await generateVariants({
        productId,
        colours,
        sizes,
        sizeSystem: system || null,
        stock,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { created = 0, skipped = 0 } = result.data ?? {};
      toast({
        tone: "success",
        message:
          skipped > 0
            ? `${created} created, ${skipped} already existed.`
            : `${created} variants created.`,
      });
      onDone();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-scrim/60"
    >
      <div className="flex items-center justify-between gap-3 border-line border-b px-4 py-3">
        <h2 className="font-bold text-ink text-sm">Generate variants</h2>
        <AdminButton
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
        >
          <X aria-hidden className="size-4" />
        </AdminButton>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
        {error && (
          <p
            role="alert"
            className="rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
          >
            {error}
          </p>
        )}

        <TokenInput
          id="gen-colours"
          label="Colours"
          hint="Press Enter or comma after each one."
          placeholder="Navy"
          values={colours}
          onChange={setColours}
        />

        <div>
          <TokenInput
            id="gen-sizes"
            label="Sizes"
            hint="Leave empty for a colours-only product."
            placeholder="M"
            values={sizes}
            onChange={setSizes}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSizes([...new Set([...sizes, ...preset.values])]);
                  setSystem(preset.system);
                }}
                className="rounded-chip border border-line px-2 py-1 font-semibold text-2xs text-ink-2 tap transition-colors hover:border-brand-400 hover:text-ink"
              >
                <Plus aria-hidden className="mr-0.5 inline size-3" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="gen-system"
              className="block font-semibold text-ink text-xs"
            >
              Size system
            </label>
            <select
              id="gen-system"
              value={system}
              onChange={(e) => setSystem(e.target.value as typeof system)}
              className={cn(inputCls(), "mt-1")}
            >
              <option value="">Not sized</option>
              <option value="APPAREL">Apparel</option>
              <option value="FOOTWEAR">Footwear</option>
              <option value="ONESIZE">One size</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="gen-stock"
              className="block font-semibold text-ink text-xs"
            >
              Opening stock, each
            </label>
            <input
              id="gen-stock"
              type="number"
              inputMode="numeric"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={cn(inputCls(), "mt-1 tnum")}
            />
            <p className="mt-1 text-2xs text-ink-3">
              Recorded in the stock ledger as an opening count.
            </p>
          </div>
        </div>

        <p className="rounded-btn bg-surface-2 px-3 py-2.5 text-ink-2 text-sm">
          {nothing ? (
            "Add at least one colour or size."
          ) : (
            <>
              This creates{" "}
              <strong className="font-bold text-ink tnum">{total}</strong>{" "}
              variant{total === 1 ? "" : "s"}. Any that already exist are
              skipped.
            </>
          )}
        </p>
      </div>

      <div className="flex justify-end gap-2 border-line border-t px-4 py-3">
        <AdminButton onClick={onClose}>Cancel</AdminButton>
        <AdminButton
          variant="primary"
          disabled={nothing || pending}
          onClick={submit}
        >
          <Grid3x3 aria-hidden className="size-4" />
          {pending ? "Creating…" : `Create ${nothing ? "" : total}`}
        </AdminButton>
      </div>
    </dialog>
  );
}

/**
 * A chip list. Enter and comma both commit; Backspace on an empty field removes
 * the last chip, which is what anyone who has used a tag input expects.
 */
function TokenInput({
  id,
  label,
  hint,
  placeholder,
  values,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...values, ...parts])]);
    setText("");
  }

  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink text-xs">
        {label}
      </label>
      {values.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1 rounded-chip bg-brand-soft px-2 py-1 font-semibold text-2xs text-brand-on">
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((v) => v !== value))}
                  aria-label={`Remove ${value}`}
                  className="tap rounded-full hover:text-danger"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          // A trailing comma means "that one is finished".
          if (e.target.value.includes(",")) commit(e.target.value);
          else setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          }
          if (e.key === "Backspace" && text === "" && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
        className={cn(inputCls(), "mt-1.5")}
      />
      <p className="mt-1 text-2xs text-ink-3">{hint}</p>
    </div>
  );
}
