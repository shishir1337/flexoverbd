"use client";

import { Check, ImagePlus, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MediaUploader } from "@/components/admin/media-uploader";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { searchMedia } from "@/server/services/admin/media-actions";

export type PickerAsset = {
  id: string;
  url: string;
  alt: string;
  folder: string | null;
};

/**
 * Choose images from the library, or upload new ones without leaving.
 *
 * Both paths in one dialog because the honest answer to "attach a photo" is
 * usually "the one I am about to take" — sending someone to Media, uploading,
 * then navigating back and finding it again is three screens for one intent.
 *
 * Multi-select with an explicit confirm rather than attach-on-click: picking
 * five photos for a gallery is one decision, and five separate round trips
 * would reorder them by whichever request finished first.
 */
export function MediaPicker({
  open,
  folder,
  excludeIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** Uploads land here, and the library filters to it by default. */
  folder?: string;
  /** Already attached — shown as ticked and not selectable again. */
  excludeIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [assets, setAssets] = useState<PickerAsset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Memoised so the effects below can depend on it honestly rather than
  // suppressing the lint — it only closes over `folder`.
  const load = useCallback(
    (q: string) => {
      startTransition(async () => {
        setAssets(await searchMedia({ q, folder }));
      });
    },
    [folder],
  );

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setSelected(new Set());
      setQuery("");
    }
    if (!open && el.open) el.close();
  }, [open]);

  /**
   * One effect for the library query, covering both the initial load and
   * typing. Debounced so a search does not fire per keystroke — and because
   * `query` is reset to "" on open, this also performs the first fetch.
   */
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => load(query), query ? 250 : 0);
    return () => clearTimeout(id);
  }, [query, open, load]);

  const excluded = new Set(excludeIds);

  function toggle(id: string) {
    if (excluded.has(id)) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-scrim/60"
    >
      <div className="flex items-center justify-between gap-3 border-line border-b px-4 py-3">
        <h2 className="font-bold text-ink text-sm">Add images</h2>
        <AdminButton
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
        >
          <X aria-hidden className="size-4" />
        </AdminButton>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        <MediaUploader
          compact
          folder={folder}
          onUploaded={(assetId) => {
            // Freshly uploaded images are pre-selected: someone who just
            // uploaded three photos to this product wants all three.
            setSelected((current) => new Set(current).add(assetId));
            load(query);
          }}
        />

        <div className="relative mt-4">
          <Search
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-ink-4"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the library by alt text or filename"
            aria-label="Search media library"
            className="h-10 w-full rounded-btn border border-line bg-surface pl-9 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {assets.length === 0 ? (
          <p className="mt-6 rounded-card border border-line border-dashed bg-surface-2 py-10 text-center text-ink-3 text-sm">
            {pending
              ? "Looking…"
              : query
                ? "Nothing matches that."
                : "The library is empty. Upload something above."}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {assets.map((asset) => {
              const isOn = selected.has(asset.id);
              const isUsed = excluded.has(asset.id);

              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => toggle(asset.id)}
                    disabled={isUsed}
                    aria-pressed={isOn}
                    title={isUsed ? "Already on this product" : asset.alt}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-btn border-2 tap transition-colors",
                      isUsed
                        ? "cursor-not-allowed border-line opacity-40"
                        : isOn
                          ? "border-brand-500"
                          : "border-transparent hover:border-line-strong",
                    )}
                  >
                    {/* Plain <img>: arbitrary CDN URLs, and next/image here
                        would mean an optimiser pass per thumbnail for a grid
                        that is already thumbnails. */}
                    {/* biome-ignore lint/performance/noImgElement: see above. */}
                    <img
                      src={asset.url}
                      alt={asset.alt}
                      loading="lazy"
                      className="aspect-square w-full bg-surface-2 object-cover"
                    />
                    {(isOn || isUsed) && (
                      <span
                        className={cn(
                          "absolute top-1 right-1 grid size-5 place-items-center rounded-full text-white",
                          isOn ? "bg-brand-600" : "bg-ink-3",
                        )}
                      >
                        <Check aria-hidden className="size-3" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-line border-t px-4 py-3">
        <p className="text-ink-3 text-sm tnum">{selected.size} selected</p>
        <div className="flex gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary"
            disabled={selected.size === 0}
            onClick={() => onConfirm([...selected])}
          >
            <ImagePlus aria-hidden className="size-4" />
            Add {selected.size > 0 ? selected.size : ""}
          </AdminButton>
        </div>
      </div>
    </dialog>
  );
}
