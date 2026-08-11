"use client";

import { AlertCircle, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { CheckboxField, FormError, inputCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { ScreenshotRow } from "@/server/services/admin/content";
import {
  deleteScreenshot,
  saveScreenshot,
} from "@/server/services/admin/content-actions";

/**
 * The customer-message wall.
 *
 * Every row is a photograph of somebody's private WhatsApp conversation, with
 * their name and often their number in it. The consent checkbox is therefore
 * the primary control on this screen, not a footnote: publishing is disabled
 * until it is ticked, and the server refuses the same combination
 * independently, so neither a stale page nor a crafted request can get round
 * it.
 */
export function ScreenshotManager({ rows }: { rows: ScreenshotRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<ScreenshotRow>>>(
    {},
  );
  const [pending, startTransition] = useTransition();

  const value = (row: ScreenshotRow) => ({ ...row, ...drafts[row.id] });

  function set(id: string, patch: Partial<ScreenshotRow>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function save(row: ScreenshotRow) {
    const v = value(row);
    setError(null);
    startTransition(async () => {
      const result = await saveScreenshot(row.id, {
        caption: v.caption,
        column: v.column,
        isActive: v.isActive,
        consentObtained: v.consentObtained,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDrafts((d) => {
        const next = { ...d };
        delete next[row.id];
        return next;
      });
      router.refresh();
    });
  }

  async function remove(row: ScreenshotRow) {
    const ok = await confirm({
      title: "Delete this screenshot?",
      body: "It is removed permanently. Untick 'Show on the homepage' instead if you only want it hidden.",
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteScreenshot(row.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Screenshot deleted." });
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-line border-dashed bg-surface p-6 text-center text-ink-3 text-sm">
        No screenshots uploaded yet. Add them in Media, then set consent and
        publish here.
      </p>
    );
  }

  return (
    <div>
      {dialog}
      <FormError message={error} />

      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const v = value(row);
          const dirty = Boolean(drafts[row.id]);
          const blocked = v.isActive && !v.consentObtained;

          return (
            <li
              key={row.id}
              className={cn(
                "rounded-card border bg-surface p-3",
                v.consentObtained ? "border-line" : "border-warn",
              )}
            >
              <div className="flex gap-3">
                {/* Plain <img>: admin thumbnails of arbitrary uploaded URLs. */}
                {/* biome-ignore lint/performance/noImgElement: see above. */}
                <img
                  src={row.url}
                  alt=""
                  className="h-28 w-20 shrink-0 rounded object-cover"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <label
                      htmlFor={`cap-${row.id}`}
                      className="block text-2xs text-ink-3"
                    >
                      Caption
                    </label>
                    <input
                      id={`cap-${row.id}`}
                      value={v.caption}
                      onChange={(e) => set(row.id, { caption: e.target.value })}
                      className={cn(inputCls(), "mt-1")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`col-${row.id}`}
                      className="block text-2xs text-ink-3"
                    >
                      Column
                    </label>
                    <select
                      id={`col-${row.id}`}
                      value={String(v.column)}
                      onChange={(e) =>
                        set(row.id, { column: Number(e.target.value) })
                      }
                      className={cn(inputCls(), "mt-1 w-28")}
                    >
                      {[0, 1, 2, 3].map((c) => (
                        <option key={c} value={c}>
                          {c + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <CheckboxField
                    checked={v.consentObtained}
                    onChange={(c) =>
                      set(row.id, {
                        consentObtained: c,
                        // Withdrawing consent unpublishes in the same motion,
                        // rather than leaving a live screenshot marked as
                        // having no permission behind it.
                        isActive: c ? v.isActive : false,
                      })
                    }
                    label="Consent obtained from the person in this screenshot"
                    hint="Required before it can be shown publicly."
                  />

                  <CheckboxField
                    checked={v.isActive}
                    onChange={(a) => set(row.id, { isActive: a })}
                    label="Show on the homepage"
                  />

                  {blocked && (
                    <p className="flex items-start gap-1.5 font-medium text-warn text-xs">
                      <AlertCircle aria-hidden className="mt-0.5 size-3.5" />
                      Record consent first — saving will be refused.
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => save(row)}
                      disabled={!dirty || pending || blocked}
                      className={adminButton("primary")}
                    >
                      <Check aria-hidden className="size-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={pending}
                      className={adminButton("danger-soft")}
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
