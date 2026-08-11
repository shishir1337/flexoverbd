"use client";

import { Check, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  CheckboxField,
  Field,
  FormError,
  inputCls,
} from "@/components/admin/form";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { FlashSaleRow } from "@/server/services/admin/marketing";
import {
  deleteFlashSale,
  saveFlashSale,
} from "@/server/services/admin/marketing-actions";

type Draft = {
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY: Draft = { name: "", startsAt: "", endsAt: "", isActive: true };

/**
 * Flash sale campaigns.
 *
 * Which products are in a campaign, and at what price, is set per product on
 * the product screen — that is where someone deciding a sale price has the cost
 * and the normal price in front of them. This screen owns the window the
 * campaign runs for, which is what the countdown on the homepage reads.
 */
export function FlashManager({ campaigns }: { campaigns: FlashSaleRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const baseId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin(c?: FlashSaleRow) {
    setError(null);
    setErrors({});
    setDraft(
      c
        ? {
            name: c.name,
            startsAt: c.startsAt,
            endsAt: c.endsAt,
            isActive: c.isActive,
          }
        : EMPTY,
    );
    setEditingId(c?.id ?? null);
    setCreating(!c);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setError(null);
    setErrors({});
  }

  function submit() {
    setError(null);
    setErrors({});
    startTransition(async () => {
      const result = await saveFlashSale(creating ? null : editingId, draft);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      cancel();
      router.refresh();
    });
  }

  async function remove(c: FlashSaleRow) {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      body: `Its ${c.itemCount} sale ${c.itemCount === 1 ? "price" : "prices"} go with it. The products themselves are untouched.`,
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteFlashSale(c.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: `${c.name} deleted.` });
      router.refresh();
    });
  }

  const ids = {
    name: `${baseId}-name`,
    startsAt: `${baseId}-startsAt`,
    endsAt: `${baseId}-endsAt`,
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const editor = (
    <div className="space-y-3.5">
      <Field id={ids.name} label="Campaign name" error={errors.name}>
        <input
          id={ids.name}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputCls(errors.name)}
        />
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          id={ids.startsAt}
          label="Starts"
          hint="Local time."
          error={errors.startsAt}
        >
          <input
            id={ids.startsAt}
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={inputCls(errors.startsAt)}
          />
        </Field>
        <Field
          id={ids.endsAt}
          label="Ends"
          hint="The countdown on the homepage runs to this."
          error={errors.endsAt}
        >
          <input
            id={ids.endsAt}
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={inputCls(errors.endsAt)}
          />
        </Field>
      </div>

      <CheckboxField
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="Enabled"
        hint="Still only runs inside the window above."
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={adminButton("primary", "md")}
        >
          <Check aria-hidden className="size-4" />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className={adminButton("secondary", "md")}
        >
          <X aria-hidden className="size-4" />
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-extrabold text-ink">Flash sales</h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            Sale prices are set per product; this is the window they run in.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary", "sm", "shrink-0")}
          >
            <Plus aria-hidden className="size-4" />
            New campaign
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      {creating && (
        <div className="mt-3 rounded-btn border border-brand-200 bg-brand-soft p-3.5">
          {editor}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {campaigns.map((c) => (
          <li key={c.id}>
            {editingId === c.id && !creating ? (
              <div className="rounded-btn border border-line p-3.5">
                {editor}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-btn border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold text-sm",
                      c.isActive ? "text-ink" : "text-ink-4",
                    )}
                  >
                    {c.name}
                    {c.isLive && (
                      <span className="ml-2 rounded-chip bg-success-soft px-1.5 py-0.5 font-medium text-2xs text-success">
                        Live now
                      </span>
                    )}
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    {c.startsAt.replace("T", " ")} →{" "}
                    {c.endsAt.replace("T", " ")} · {c.itemCount}{" "}
                    {c.itemCount === 1 ? "product" : "products"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => begin(c)}
                  aria-label={`Edit ${c.name}`}
                  className={adminButton("ghost", "icon", "shrink-0")}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  disabled={pending}
                  aria-label={`Delete ${c.name}`}
                  className={adminButton(
                    "ghost",
                    "icon",
                    "shrink-0 hover:bg-danger-soft hover:text-danger",
                  )}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {campaigns.length === 0 && !creating && (
          <li className="py-2">
            <EmptyState
              icon={Zap}
              title="No flash sales scheduled"
              body="Create a window here, then set the sale price on each product you want in it."
            />
          </li>
        )}
      </ul>
    </section>
  );
}
