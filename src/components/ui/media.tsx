import {
  Dumbbell,
  Glasses,
  Headphones,
  ImageIcon,
  type LucideIcon,
  Shirt,
  ShoppingBag,
  Sparkles,
  SprayCan,
  UtensilsCrossed,
  Watch,
} from "lucide-react";
import Image from "next/image";
import type { ImageAsset } from "@/data/types";
import { resolvePublicImage } from "@/lib/public-files";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Placeholder art direction
 *
 * A missing image should still look like a designed surface, not a broken
 * one — the client is judging layout and rhythm, so grey boxes would sell the
 * design short. Each placeholder gets a deterministic pastel backdrop (so the
 * same product always looks the same across renders and pages) plus a
 * category-appropriate glyph.
 * ---------------------------------------------------------------------- */

const LIGHT_TONES = [
  "from-orange-100 via-amber-50 to-surface",
  "from-rose-100 via-pink-50 to-surface",
  "from-sky-100 via-blue-50 to-surface",
  "from-emerald-100 via-teal-50 to-surface",
  "from-violet-100 via-purple-50 to-surface",
  "from-amber-100 via-orange-50 to-surface",
  "from-stone-200 via-stone-100 to-surface",
  "from-lime-100 via-green-50 to-surface",
];

const DARK_TONES = [
  "from-slate-800 via-slate-700 to-slate-800",
  "from-stone-800 via-stone-700 to-stone-800",
  "from-orange-900 via-amber-800 to-orange-900",
];

/**
 * Icons for the categories that shipped with the store.
 *
 * Keyed loosely, not by `CategorySlug`: an admin can create a category with any
 * slug, and a missing entry must degrade to the fallback icon rather than pass
 * `undefined` down as a component and blow up the render.
 */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  fashion: Shirt,
  gadgets: Headphones,
  "home-essentials": UtensilsCrossed,
  beauty: Sparkles,
  fragrances: SprayCan,
  lifestyle: Glasses,
  sports: Dumbbell,
  "watches-bags": Watch,
};

/** Used for any category without a bespoke icon. */
export const DEFAULT_CATEGORY_ICON: LucideIcon = ShoppingBag;

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICON[slug] ?? DEFAULT_CATEGORY_ICON;
}

/** Tiny stable string hash so a given asset always picks the same backdrop. */
function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Placeholder styling only — this is *not* the banner scrim tone.
 *
 * A banner can be toned "none" (no scrim, artwork carries itself), but a
 * missing-image placeholder still has to be either pale or dark to be visible.
 * There is no third placeholder, so "none" is accepted and normalised to
 * "light" rather than forcing every caller to translate.
 */
type Tone = "light" | "dark" | "none";

type MediaProps = {
  asset: ImageAsset;
  /** Responsive `sizes` hint — always pass one, it halves mobile image weight. */
  sizes: string;
  priority?: boolean;
  className?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** `object-contain` suits packshots, `object-cover` suits lifestyle art. */
  fit?: "cover" | "contain";
};

/**
 * Renders the real optimised image once it exists in `public/`, and a branded
 * placeholder until then. Must be placed inside a `relative` element that
 * establishes the aspect ratio — this component only fills it.
 */
export function Media({
  asset,
  sizes,
  priority = false,
  className,
  icon: Icon = ImageIcon,
  tone = "light",
  fit = "cover",
}: MediaProps) {
  // See the Tone comment: the placeholder has no "none" variant.
  const placeholderTone = tone === "none" ? "light" : tone;
  const resolved = resolvePublicImage(asset.src);

  if (resolved) {
    return (
      <Image
        src={resolved}
        alt={asset.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          fit === "cover" ? "object-cover" : "object-contain",
          className,
        )}
      />
    );
  }

  const tones = placeholderTone === "dark" ? DARK_TONES : LIGHT_TONES;
  const gradient = tones[hash(asset.src) % tones.length];

  return (
    <div
      role="img"
      aria-label={asset.alt}
      // The prompt rides along on the element so it is one inspect away when
      // the client is sourcing artwork, without cluttering the visual design.
      title={asset.prompt}
      data-placeholder-for={asset.src}
      className={cn(
        "absolute inset-0 grid place-items-center bg-linear-to-br",
        gradient,
        className,
      )}
    >
      {/* Soft vignette so flat gradients still read as a photographed backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_255_255/0.55),transparent_60%)]"
      />
      <Icon
        aria-hidden
        strokeWidth={1.25}
        className={cn(
          "relative size-[26%] max-h-24 min-h-8 max-w-24 min-w-8",
          placeholderTone === "dark" ? "text-white/25" : "text-ink/18",
        )}
      />
    </div>
  );
}
