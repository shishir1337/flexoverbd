import {
  BadgeCheck,
  Gift,
  Headphones,
  Heart,
  type LucideIcon,
  Package,
  Percent,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Truck,
  User,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * Icon names an admin can choose from.
 *
 * Deliberately a curated map rather than a dynamic import of all of
 * `lucide-react`. Nav links and trust items store an icon *name* in the
 * database, and resolving an arbitrary name at runtime would mean shipping the
 * entire icon set — roughly a thousand components — to every visitor so that
 * four of them can render. These are the ones the store's own copy needs, and
 * adding another is one line here.
 */
export const ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Gift,
  Headphones,
  Heart,
  Package,
  Percent,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Truck,
  User,
  Wallet,
  Zap,
};

/** Names the admin offers, in a sensible order for a picker. */
export const ICON_NAMES = Object.keys(ICONS).sort();

/**
 * A missing or misspelled name falls back rather than rendering `undefined` as
 * a component, which throws and takes the whole route down.
 */
export function icon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || ShoppingBag;
}
