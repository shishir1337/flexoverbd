"use client";

import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { inputCls } from "@/components/admin/form";
import { MediaPicker } from "@/components/admin/media-picker";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import {
  attachProductImages,
  detachProductImage,
  reorderProductImages,
  setProductImageAlt,
} from "@/server/services/admin/product-image-actions";

export type GalleryImage = {
  id: string;
  mediaId: string;
  url: string;
  alt: string;
};

/**
 * The product's photographs.
 *
 * The first image is the primary one — on the card, in search results, in the
 * Open Graph tag — so it is labelled as such rather than left as an invisible
 * property of being first. "Make primary" moves an image to the front, which
 * is the same operation as reordering; there is no separate flag to disagree
 * with the order.
 *
 * Arrows rather than drag-and-drop, matching the rest of the admin: this gets
 * used on a phone, where a drag target competes with page scroll.
 */
export function ImageGallery({
  productId,
  images,
}: {
  productId: string;
  images: GalleryImage[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [picking, setPicking] = useState(false);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  // Derived from props with only the optimistic order held locally — the same
  // pattern as every other admin list, for the same reason.
  const ordered = pendingOrder
    ? [...images].sort(
        (a, b) => pendingOrder.indexOf(a.id) - pendingOrder.indexOf(b.id),
      )
    : images;

  function move(index: number, delta: number) {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const order = next.map((i) => i.id);
    setPendingOrder(order);

    startTransition(async () => {
      const result = await reorderProductImages({ productId, imageIds: order });
      if (!result.ok) {
        setPendingOrder(null);
        toast({ tone: "error", message: result.error });
        return;
      }
      router.refresh();
    });
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...ordered];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);

    const order = next.map((i) => i.id);
    setPendingOrder(order);

    startTransition(async () => {
      const result = await reorderProductImages({ productId, imageIds: order });
      if (!result.ok) {
        setPendingOrder(null);
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Primary image updated." });
      router.refresh();
    });
  }

  function attach(mediaIds: string[]) {
    setPicking(false);
    startTransition(async () => {
      const result = await attachProductImages({ productId, mediaIds });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setPendingOrder(null);
      toast({
        tone: "success",
        message: `${result.data?.added ?? 0} added.`,
      });
      router.refresh();
    });
  }

  async function remove(image: GalleryImage) {
    const ok = await confirm({
      title: "Remove this image?",
      body: "It comes off this product but stays in the media library, so you can add it back or use it elsewhere.",
      confirmLabel: "Remove",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await detachProductImage({ productId, imageId: image.id });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setPendingOrder(null);
      toast({ tone: "success", message: "Image removed." });
      router.refresh();
    });
  }

  function saveAlt(imageId: string) {
    startTransition(async () => {
      const result = await setProductImageAlt({
        productId,
        imageId,
        alt: altDraft,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setEditingAlt(null);
      toast({ tone: "success", message: "Alt text saved." });
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface shadow-xs">
      {dialog}
      <MediaPicker
        open={picking}
        folder="products"
        excludeIds={images.map((i) => i.mediaId)}
        onClose={() => setPicking(false)}
        onConfirm={attach}
      />

      <header className="flex flex-wrap items-center justify-between gap-2 border-line border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-bold text-ink text-sm">Photos</h2>
          <p className="mt-0.5 text-ink-3 text-xs">
            The first one is used on cards and in search results.
          </p>
        </div>
        <AdminButton variant="primary" onClick={() => setPicking(true)}>
          <ImagePlus aria-hidden className="size-4" />
          Add photos
        </AdminButton>
      </header>

      <div className="p-4 sm:p-5">
        {ordered.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title="No photos yet"
            body="A product without a photo shows a placeholder tile on the storefront and is far less likely to sell."
            action={
              <AdminButton variant="primary" onClick={() => setPicking(true)}>
                <ImagePlus aria-hidden className="size-4" />
                Add the first photo
              </AdminButton>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ordered.map((image, index) => (
              <li
                key={image.id}
                className={cn(
                  "overflow-hidden rounded-card border bg-surface",
                  index === 0 ? "border-brand-500" : "border-line",
                )}
              >
                <div className="relative">
                  {/* Plain <img>: CDN URLs, and these are already thumbnails. */}
                  {/* biome-ignore lint/performance/noImgElement: see above. */}
                  <img
                    src={image.url}
                    alt={image.alt}
                    loading="lazy"
                    className="aspect-square w-full bg-surface-2 object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-chip bg-brand-600 px-1.5 py-0.5 font-bold text-2xs text-white">
                      <Star aria-hidden className="size-2.5 fill-current" />
                      Primary
                    </span>
                  )}
                </div>

                <div className="p-2">
                  {editingAlt === image.id ? (
                    <div className="space-y-1.5">
                      <input
                        value={altDraft}
                        onChange={(e) => setAltDraft(e.target.value)}
                        aria-label="Alt text for this photo"
                        placeholder="Navy shirt, front"
                        className={cn(inputCls(), "h-9 text-sm")}
                      />
                      <div className="flex gap-1.5">
                        <AdminButton
                          variant="primary"
                          onClick={() => saveAlt(image.id)}
                          disabled={pending}
                          className="flex-1"
                        >
                          Save
                        </AdminButton>
                        <AdminButton onClick={() => setEditingAlt(null)}>
                          Cancel
                        </AdminButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-2xs text-ink-3">
                        {image.alt || (
                          <span className="text-danger">No alt text</span>
                        )}
                      </p>

                      <div className="mt-1.5 flex items-center gap-0.5">
                        <AdminButton
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0 || pending}
                          onClick={() => move(index, -1)}
                          aria-label="Move earlier"
                        >
                          <ArrowLeft aria-hidden className="size-3.5" />
                        </AdminButton>
                        <AdminButton
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === ordered.length - 1 || pending}
                          onClick={() => move(index, 1)}
                          aria-label="Move later"
                        >
                          <ArrowRight aria-hidden className="size-3.5" />
                        </AdminButton>
                        {index !== 0 && (
                          <AdminButton
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            onClick={() => makePrimary(index)}
                            aria-label="Make this the primary photo"
                            title="Make primary"
                          >
                            <Star aria-hidden className="size-3.5" />
                          </AdminButton>
                        )}
                        <AdminButton
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setAltDraft(image.alt);
                            setEditingAlt(image.id);
                          }}
                          aria-label="Edit alt text"
                        >
                          <Pencil aria-hidden className="size-3.5" />
                        </AdminButton>
                        <AdminButton
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => remove(image)}
                          aria-label="Remove from this product"
                          className="ml-auto hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 aria-hidden className="size-3.5" />
                        </AdminButton>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
