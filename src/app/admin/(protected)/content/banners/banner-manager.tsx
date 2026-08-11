"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Image as ImageIcon,
  ImageOff,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  CheckboxField,
  Field,
  FormError,
  inputCls,
  textareaCls,
} from "@/components/admin/form";
import { MediaPicker } from "@/components/admin/media-picker";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { BannerRow } from "@/server/services/admin/content";
import {
  deleteBanner,
  reorderBanners,
  saveBanner,
} from "@/server/services/admin/content-actions";
import { setBannerImages } from "@/server/services/admin/media-actions";

type Placement = "HERO" | "PROMO_TILE" | "WIDE";
type Tone = "LIGHT" | "DARK" | "NONE";

/**
 * The form's own shape: every field is a string while being edited, matching
 * what the inputs produce. The enums stay narrow so a typo cannot reach the
 * action, which would only surface as a validation error at save time.
 */
type Draft = {
  placement: Placement;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  tone: Tone;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  /** "" means no artwork — the schema turns that into null. */
  imageDesktopId: string;
  imageMobileId: string;
};

const TONES: { value: Tone; label: string }[] = [
  { value: "LIGHT", label: "Light photo — dark copy" },
  { value: "DARK", label: "Dark photo — white copy" },
  // For a banner that is only artwork: a scrim has nothing to make legible.
  { value: "NONE", label: "None — no scrim, artwork only" },
];

/**
 * Banners for one placement.
 *
 * Rendered once per placement rather than as a single mixed list, because
 * position is scoped to the placement: reordering the hero carousel must not
 * renumber the promo tiles.
 *
 * Artwork is chosen here rather than in Media, in the end — someone writing a
 * slide needs to see the picture the copy sits on, and bouncing between two
 * screens to pair them was worse than a slightly longer form.
 */
export function BannerManager({
  placement,
  title,
  description,
  banners,
  images,
}: {
  placement: Placement;
  title: string;
  description: string;
  banners: BannerRow[];
  images: { id: string; url: string; alt: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const baseId = useId();
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin(banner?: BannerRow) {
    setError(null);
    setErrors({});
    setDraft({
      placement,
      eyebrow: banner?.eyebrow ?? "",
      title: banner?.title ?? "",
      subtitle: banner?.subtitle ?? "",
      cta: banner?.cta ?? "",
      href: banner?.href ?? "",
      tone: (banner?.tone as Tone) ?? "LIGHT",
      isActive: banner?.isActive ?? true,
      startsAt: banner?.startsAt ?? "",
      endsAt: banner?.endsAt ?? "",
      imageDesktopId: banner?.desktopId ?? "",
      imageMobileId: banner?.mobileId ?? "",
    });
    setEditingId(banner?.id ?? null);
    setCreating(!banner);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setDraft(null);
    setError(null);
    setErrors({});
  }

  function submit() {
    if (!draft) return;
    setError(null);
    setErrors({});
    startTransition(async () => {
      const result = await saveBanner(creating ? null : editingId, draft);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      cancel();
      router.refresh();
    });
  }

  /**
   * Derived from props; only the pending order is local. See the note in
   * `record-list.tsx` — `useState(banners)` hid every newly created banner
   * until a full reload.
   */
  const items = useMemo(() => {
    if (!pendingOrder) return banners;
    const rank = new Map(pendingOrder.map((id, i) => [id, i]));
    return [...banners].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (rank.get(b.id) ?? Number.POSITIVE_INFINITY),
    );
  }, [banners, pendingOrder]);

  async function remove(banner: BannerRow) {
    const ok = await confirm({
      title: `Delete "${banner.title}"?`,
      body: "It comes off the storefront immediately. Uncheck 'Live' instead if you may want it back.",
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBanner(banner.id);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: "Banner deleted." });
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
      const result = await reorderBanners(order);
      if (!result.ok) {
        setPendingOrder(null);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const ids = {
    eyebrow: `${baseId}-eyebrow`,
    title: `${baseId}-title`,
    subtitle: `${baseId}-subtitle`,
    cta: `${baseId}-cta`,
    href: `${baseId}-href`,
    tone: `${baseId}-tone`,
    startsAt: `${baseId}-startsAt`,
    endsAt: `${baseId}-endsAt`,
    imageDesktop: `${baseId}-image-desktop`,
    imageMobile: `${baseId}-image-mobile`,
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function saveImages(bannerId: string, desktopId: string, mobileId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setBannerImages({ bannerId, desktopId, mobileId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const editor = draft && (
    <div className="space-y-3.5">
      {/* Artwork first, and before the copy.

          A banner is often just a photograph — the copy is the optional layer
          over it, not the other way round. Until now artwork could only be
          assigned to a banner that had already been saved, from a control in
          the list below, so creating an image-only banner meant saving an
          empty one first and then going to find it. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={ids.imageDesktop}
          label="Desktop artwork"
          hint="Wide crop, shown from tablet up."
        >
          <ImageChoice
            value={draft.imageDesktopId}
            images={images}
            onChange={(v) => set("imageDesktopId", v)}
          />
        </Field>
        <Field
          id={ids.imageMobile}
          label="Mobile artwork"
          hint="Tall crop. Falls back to the desktop image."
        >
          <ImageChoice
            value={draft.imageMobileId}
            images={images}
            onChange={(v) => set("imageMobileId", v)}
          />
        </Field>
      </div>

      <Field id={ids.title} label="Title" error={errors.title}>
        <input
          id={ids.title}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputCls(errors.title)}
        />
      </Field>

      <Field
        id={ids.eyebrow}
        label="Eyebrow"
        hint="Small line above the title."
      >
        <input
          id={ids.eyebrow}
          value={draft.eyebrow}
          onChange={(e) => set("eyebrow", e.target.value)}
          className={inputCls()}
        />
      </Field>

      <Field id={ids.subtitle} label="Subtitle">
        <textarea
          id={ids.subtitle}
          rows={2}
          value={draft.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          className={textareaCls()}
        />
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field id={ids.cta} label="Button label">
          <input
            id={ids.cta}
            value={draft.cta}
            onChange={(e) => set("cta", e.target.value)}
            className={inputCls()}
          />
        </Field>
        <Field
          id={ids.href}
          label="Button link"
          hint="A path like /offers."
          error={errors.href}
        >
          <input
            id={ids.href}
            value={draft.href}
            onChange={(e) => set("href", e.target.value)}
            className={inputCls(errors.href)}
          />
        </Field>
      </div>

      <Field
        id={ids.tone}
        label="Copy tone"
        hint="Set this from how pale the photograph is, not from the site theme."
      >
        <select
          id={ids.tone}
          value={draft.tone}
          onChange={(e) => set("tone", e.target.value as Tone)}
          className={inputCls()}
        >
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          id={ids.startsAt}
          label="Starts"
          hint="Blank means immediately."
          error={errors.startsAt}
        >
          <input
            id={ids.startsAt}
            type="date"
            value={draft.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={inputCls(errors.startsAt)}
          />
        </Field>
        <Field
          id={ids.endsAt}
          label="Ends"
          hint="Blank means it runs until switched off."
          error={errors.endsAt}
        >
          <input
            id={ids.endsAt}
            type="date"
            value={draft.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={inputCls(errors.endsAt)}
          />
        </Field>
      </div>

      <CheckboxField
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="Live on the storefront"
        hint="Still subject to the dates above."
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
          <h2 className="font-extrabold text-ink">{title}</h2>
          <p className="mt-0.5 text-ink-3 text-sm">{description}</p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary", "sm", "shrink-0")}
          >
            <Plus aria-hidden className="size-4" />
            Add
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
        {items.map((banner, i) => (
          <li key={banner.id}>
            {editingId === banner.id && !creating ? (
              <div className="rounded-btn border border-line p-3.5">
                {editor}
              </div>
            ) : (
              <div className="rounded-btn border border-line p-2.5">
                <div className="flex items-center gap-2">
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

                  {/* Plain <img>: these are admin thumbnails of arbitrary remote
                    URLs, and routing them through next/image would mean
                    whitelisting every host an admin might upload from. */}
                  {banner.desktopUrl ? (
                    // biome-ignore lint/performance/noImgElement: see above.
                    <img
                      src={banner.desktopUrl}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span
                      className="grid size-12 shrink-0 place-items-center rounded bg-surface-2 text-ink-4"
                      title="No image assigned"
                    >
                      <ImageOff aria-hidden className="size-4" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-semibold text-sm",
                        banner.isActive ? "text-ink" : "text-ink-4",
                      )}
                    >
                      {banner.title}
                    </p>
                    <p className="truncate text-2xs text-ink-3">
                      {[
                        banner.isActive ? "Live" : "Hidden",
                        banner.startsAt && `from ${banner.startsAt}`,
                        banner.endsAt && `until ${banner.endsAt}`,
                        !banner.desktopUrl && "no image",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => begin(banner)}
                    aria-label={`Edit ${banner.title}`}
                    className={adminButton("ghost", "icon", "shrink-0")}
                  >
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(banner)}
                    disabled={pending}
                    aria-label={`Delete ${banner.title}`}
                    className={adminButton(
                      "ghost",
                      "icon",
                      "shrink-0 hover:bg-danger-soft hover:text-danger",
                    )}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>

                {/* Artwork saves on change, independently of the copy form —
                  swapping a picture should not mean re-saving the words. */}
                <div className="mt-2 grid gap-2 border-line border-t pt-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-2xs text-ink-3">
                      Desktop image
                    </span>
                    <select
                      value={banner.desktopId}
                      disabled={pending}
                      onChange={(e) =>
                        saveImages(banner.id, e.target.value, banner.mobileId)
                      }
                      className="mt-1 h-10 w-full rounded-btn border border-line bg-surface px-2 text-ink text-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">None</option>
                      {images.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.alt || i.url.split("/").pop()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-2xs text-ink-3">
                      Mobile crop
                    </span>
                    <select
                      value={banner.mobileId}
                      disabled={pending}
                      onChange={(e) =>
                        saveImages(banner.id, banner.desktopId, e.target.value)
                      }
                      className="mt-1 h-10 w-full rounded-btn border border-line bg-surface px-2 text-ink text-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Same as desktop</option>
                      {images.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.alt || i.url.split("/").pop()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && !creating && (
          <li className="py-2">
            <EmptyState
              icon={ImageOff}
              title="Nothing in this slot"
              body="Add one and it appears on the homepage as soon as it is live."
            />
          </li>
        )}
      </ul>
    </section>
  );
}

/**
 * Choose artwork, or upload it here.
 *
 * This was a `<select>` of whatever already sat in the media library, which
 * failed twice over: there was no way to upload from this screen at all, and
 * the options were filtered to the `banners` folder, so an image uploaded from
 * the Media screen never appeared in the list either. Creating a banner meant
 * leaving, uploading, coming back, and finding the file had gone to the wrong
 * folder anyway.
 *
 * `MediaPicker` is the component the product gallery already uses: it searches
 * the whole library *and* uploads inline, and anything uploaded through it
 * lands in the folder passed here.
 */
function ImageChoice({
  value,
  images,
  onChange,
}: {
  value: string;
  images: { id: string; url: string; alt: string }[];
  onChange: (value: string) => void;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const chosen = images.find((i) => i.id === value);

  return (
    <div className="flex items-start gap-2.5">
      <MediaPicker
        open={picking}
        folder="banners"
        excludeIds={[]}
        onClose={() => setPicking(false)}
        onConfirm={(ids) => {
          setPicking(false);
          if (ids[0]) onChange(ids[0]);
          // A freshly uploaded asset is not in the `images` prop yet, which is
          // server-rendered. Refreshing resolves its thumbnail rather than
          // leaving the tile blank until the next navigation.
          router.refresh();
        }}
      />

      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-btn border border-line bg-surface-2">
        {chosen ? (
          // Plain <img>: arbitrary CDN URLs, already thumbnail-sized here.
          // biome-ignore lint/performance/noImgElement: see above.
          <img
            src={chosen.url}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon aria-hidden className="size-5 text-ink-4" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className={adminButton("secondary", "sm", "w-full justify-center")}
        >
          <ImagePlus aria-hidden className="size-4" />
          {chosen ? "Replace" : "Choose or upload"}
        </button>
        {chosen && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-2xs text-ink-3 tap hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
