/**
 * Suggest a URL slug from a display name.
 *
 * Only ever a *suggestion* — the server validates the shape and rejects
 * duplicates, because two admins naming a category at once will both be handed
 * the same slug and only one can have it. NFD-normalising first means accented
 * input ("Cafe" typed with an acute) loses its marks rather than the whole
 * word: the ̀-ͯ range is the Unicode combining diacriticals block
 * that decomposition leaves behind.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Apostrophes are dropped, not treated as separators. "Men's Shirts"
      // should be `mens-shirts`, not `men-s-shirts` — the latter reads as a
      // typo, and a slug is permanent the moment a link is shared.
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      // A trailing dash can survive the 60-char truncation above.
      .replace(/-+$/g, "")
  );
}
