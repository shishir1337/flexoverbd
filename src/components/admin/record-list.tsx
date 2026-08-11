"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ContentRow } from "@/server/services/admin/content";
import {
  type ContentKind,
  deleteContentItem,
  reorderContentItems,
  saveContentItem,
} from "@/server/services/admin/content-actions";
import { useConfirm } from "./confirm-dialog";
import { CheckboxField, FormError, inputCls, textareaCls } from "./form";
import { EmptyState } from "./page-header";
import { useToast } from "./toaster";
import { adminButton } from "./ui";

export type RecordField = {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "date" | "select";
  options?: { value: string; label: string }[];
  /** Rendered as the row's headline when collapsed. */
  primary?: boolean;
};

/**
 * One editor for every ordered content list.
 *
 * Announcements, trending searches, FAQ entries, trust items and nav links are
 * the same interaction — a short ordered list of small records, edited in place
 * — and building five of them would mean five chances to forget the reorder or
 * the active toggle. The differences are a field spec and a kind.
 *
 * Ordering uses buttons rather than drag-and-drop for the same reason as the
 * category list: this gets edited from a phone, where a drag target fights the
 * page scroll.
 */
export function RecordList({
  kind,
  title,
  description,
  fields,
  rows,
  addLabel = "Add",
  reorderable = true,
}: {
  kind: ContentKind;
  title: string;
  description?: string;
  fields: RecordField[];
  rows: ContentRow[];
  addLabel?: string;
  reorderable?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const baseId = useId();
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftActive, setDraftActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const primaryKey = fields.find((f) => f.primary)?.key ?? fields[0]?.key;

  const blank = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.type === "select" ? (f.options?.[0]?.value ?? "") : "",
      ]),
    );

  function begin(row?: ContentRow) {
    setError(null);
    setErrors({});
    setDraft(
      row
        ? Object.fromEntries(
            fields.map((f) => [f.key, String(row.fields[f.key] ?? "")]),
          )
        : blank(),
    );
    setDraftActive(row?.isActive ?? true);
    setEditingId(row?.id ?? null);
    setCreating(!row);
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
      const result = await saveContentItem(kind, creating ? null : editingId, {
        ...draft,
        isActive: draftActive,
      });
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      toast({ tone: "success", message: "Saved." });
      cancel();
      router.refresh();
    });
  }

  function toggleActive(row: ContentRow) {
    setError(null);
    startTransition(async () => {
      const result = await saveContentItem(kind, row.id, {
        ...Object.fromEntries(
          fields.map((f) => [f.key, String(row.fields[f.key] ?? "")]),
        ),
        isActive: !row.isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  /**
   * Reordering is optimistic, but the list itself is derived from props.
   *
   * Holding the rows in `useState(rows)` looked fine and was wrong: `useState`
   * ignores its initialiser after the first render, so a row created through
   * this very form was written to the database, `router.refresh()` re-rendered
   * the server component with it, and the list still showed the old array until
   * someone reloaded the page. Only the pending order is local state; anything
   * not in it sorts last, which is where a newly created row belongs.
   */
  const items = useMemo(() => {
    if (!pendingOrder) return rows;
    const rank = new Map(pendingOrder.map((id, i) => [id, i]));
    return [...rows].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (rank.get(b.id) ?? Number.POSITIVE_INFINITY),
    );
  }, [rows, pendingOrder]);

  async function remove(row: ContentRow) {
    const ok = await confirm({
      title: "Delete this entry?",
      body: `"${String(row.fields[primaryKey] ?? "").slice(0, 80)}" will be removed. Hide it instead if you only want it off the site for now.`,
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteContentItem(kind, row.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Deleted." });
      router.refresh();
    });
  }

  function move(index: number, delta: number) {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const order = next.map((x) => x.id);
    setPendingOrder(order);
    setError(null);

    startTransition(async () => {
      const result = await reorderContentItems(kind, order);
      if (!result.ok) {
        setPendingOrder(null);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const editor = (
    <div className="space-y-3">
      {fields.map((f) => {
        const id = `${baseId}-${f.key}`;
        const value = draft[f.key] ?? "";
        const fieldError = errors[f.key];

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
                <textarea
                  id={id}
                  rows={3}
                  value={value}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  className={textareaCls(fieldError)}
                />
              ) : f.type === "select" ? (
                <select
                  id={id}
                  value={value}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  className={inputCls(fieldError)}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={f.type === "date" ? "date" : "text"}
                  value={value}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                  }
                  className={inputCls(fieldError)}
                />
              )}
            </div>
            {fieldError && (
              <p role="alert" className="mt-1 font-medium text-danger text-xs">
                {fieldError}
              </p>
            )}
          </div>
        );
      })}

      <CheckboxField
        checked={draftActive}
        onChange={setDraftActive}
        label="Live on the storefront"
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
        <div>
          <h2 className="font-extrabold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-ink-3 text-sm">{description}</p>
          )}
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary")}
          >
            <Plus aria-hidden className="size-4" />
            {addLabel}
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

      <ul className="mt-3 divide-y divide-line">
        {items.map((row, i) => (
          <li key={row.id} className="py-2.5">
            {editingId === row.id && !creating ? (
              <div className="rounded-btn border border-line p-3.5">
                {editor}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {reorderable && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || pending}
                      aria-label="Move up"
                      className="grid size-6 place-items-center rounded text-ink-3 tap hover:bg-surface-2 disabled:opacity-25"
                    >
                      <ArrowUp aria-hidden className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1 || pending}
                      aria-label="Move down"
                      className="grid size-6 place-items-center rounded text-ink-3 tap hover:bg-surface-2 disabled:opacity-25"
                    >
                      <ArrowDown aria-hidden className="size-3.5" />
                    </button>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold text-sm",
                      row.isActive ? "text-ink" : "text-ink-4",
                    )}
                  >
                    {String(row.fields[primaryKey] ?? "—")}
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    {fields
                      .filter((f) => f.key !== primaryKey)
                      .map((f) => row.fields[f.key])
                      .filter(Boolean)
                      .join(" · ") || (row.isActive ? "Live" : "Hidden")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleActive(row)}
                  disabled={pending}
                  aria-label={row.isActive ? "Hide" : "Show"}
                  className="grid size-9 shrink-0 place-items-center rounded-btn text-ink-3 tap hover:bg-surface-2 disabled:opacity-40"
                >
                  {row.isActive ? (
                    <Eye aria-hidden className="size-4" />
                  ) : (
                    <EyeOff aria-hidden className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => begin(row)}
                  aria-label="Edit"
                  className={adminButton("ghost", "icon", "shrink-0")}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  disabled={pending}
                  aria-label="Delete"
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
        {items.length === 0 && !creating && (
          <li className="py-2">
            <EmptyState
              icon={ListPlus}
              title={`No ${title.toLowerCase()} yet`}
              body="Nothing here means nothing renders on the storefront for this section."
            />
          </li>
        )}
      </ul>
    </section>
  );
}
