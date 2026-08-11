"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FormError, inputCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { MediaRow } from "@/server/services/admin/media";
import { saveMediaAlt } from "@/server/services/admin/media-actions";
import { deleteMedia } from "@/server/services/admin/media-upload-actions";

/**
 * The library grid.
 *
 * Each tile shows what the image is used by, because the reason to open this
 * screen is usually "which of these is still a placeholder, and what would
 * break if I swapped it". Alt text is editable in place; nothing else about an
 * asset can change without a re-upload.
 */
export function MediaGrid({ assets }: { assets: MediaRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function remove(a: MediaRow) {
    const ok = await confirm({
      title: "Delete this image?",
      body: "It is removed from ImageKit as well as from here, and cannot be recovered.",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteMedia(a.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Image deleted." });
      router.refresh();
    });
  }

  function save(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await saveMediaAlt({ id, alt: draft });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  if (assets.length === 0) {
    return (
      <p className="mt-6 rounded-card border border-line border-dashed bg-surface p-8 text-center text-ink-3 text-sm">
        Nothing matches.
      </p>
    );
  }

  return (
    <div>
      {dialog}
      {error && (
        <div className="mb-3">
          <FormError message={error} />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <li
            key={a.id}
            className={cn(
              "overflow-hidden rounded-card border bg-surface",
              a.isDemo ? "border-warn" : "border-line",
            )}
          >
            {/* Plain <img>: arbitrary uploaded URLs, and next/image would mean
                whitelisting every host artwork might ever come from. */}
            {/* biome-ignore lint/performance/noImgElement: see above. */}
            <img
              src={a.url}
              alt={a.alt}
              loading="lazy"
              className="aspect-square w-full bg-surface-2 object-cover"
            />

            <div className="p-2.5">
              {editingId === a.id ? (
                <div className="space-y-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="Alt text"
                    className={cn(inputCls(), "h-10 text-sm")}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => save(a.id)}
                      disabled={pending}
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-btn bg-brand-600 font-semibold text-white text-xs tap disabled:opacity-40"
                    >
                      <Check aria-hidden className="size-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                      className="grid size-9 place-items-center rounded-btn border border-line text-ink-3 tap"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-1.5">
                    <p className="min-w-0 flex-1 text-2xs text-ink-2 line-clamp-2">
                      {a.alt || (
                        <span className="text-danger">No alt text</span>
                      )}
                    </p>
                    <span className="flex shrink-0">
                      <AdminButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setDraft(a.alt);
                          setEditingId(a.id);
                        }}
                        aria-label={`Edit alt text for ${a.alt || "image"}`}
                      >
                        <Pencil aria-hidden className="size-3.5" />
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending || a.usage.length > 0}
                        title={
                          a.usage.length > 0
                            ? "In use — replace it where it is used first"
                            : "Delete"
                        }
                        onClick={() => remove(a)}
                        aria-label={`Delete ${a.alt || "image"}`}
                        className="hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                      </AdminButton>
                    </span>
                  </div>

                  <p className="mt-1 text-2xs text-ink-4">
                    {a.usage.length > 0 ? a.usage.join(" · ") : "unused"}
                    {a.isDemo && (
                      <span className="ml-1 font-semibold text-warn">
                        · placeholder
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
