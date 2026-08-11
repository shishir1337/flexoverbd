/**
 * The tint palette a category can be given.
 *
 * A closed list, not free text. The tint is a pair of Tailwind gradient
 * classes, and Tailwind only emits the CSS for classes it can find written out
 * in the source — an admin typing `from-cyan-100` into a text box would save
 * fine, validate fine, and then render no gradient at all, with nothing to
 * explain why. Listing them here both generates the CSS and gives the picker
 * something to show.
 */
export const CATEGORY_TINTS = [
  { value: "from-rose-100 to-orange-50", label: "Rose" },
  { value: "from-sky-100 to-indigo-50", label: "Sky" },
  { value: "from-amber-100 to-yellow-50", label: "Amber" },
  { value: "from-pink-100 to-rose-50", label: "Pink" },
  { value: "from-stone-200 to-amber-50", label: "Stone" },
  { value: "from-emerald-100 to-teal-50", label: "Emerald" },
  { value: "from-lime-100 to-green-50", label: "Lime" },
  { value: "from-stone-200 to-orange-50", label: "Sand" },
  { value: "from-violet-100 to-fuchsia-50", label: "Violet" },
  { value: "from-cyan-100 to-blue-50", label: "Cyan" },
] as const;

export type CategoryTint = (typeof CATEGORY_TINTS)[number]["value"];

export const DEFAULT_TINT: CategoryTint = "from-rose-100 to-orange-50";

export function isCategoryTint(value: string): value is CategoryTint {
  return CATEGORY_TINTS.some((t) => t.value === value);
}
