import type { ImageAsset } from "@/data/types";
import { resolvePublicImage } from "./public-files";

/**
 * Gallery shots are found by convention rather than declared in the data:
 * `<slug>.jpg` is the primary, and `<slug>-2`, `-3`, `-4` are additional views
 * if they exist on disk.
 *
 * That keeps `products.ts` from carrying four near-identical asset objects per
 * item, and it means adding a second photo of something is a file copy —
 * exactly like replacing the primary. When the backend lands, this becomes an
 * `images[]` column and the component signature does not change.
 *
 * Server-only: it stats the filesystem, so it runs at build time.
 */
const MAX_GALLERY = 4;

export function getGallery(primary: ImageAsset): ImageAsset[] {
  const dot = primary.src.lastIndexOf(".");
  const base = dot === -1 ? primary.src : primary.src.slice(0, dot);
  const ext = dot === -1 ? ".jpg" : primary.src.slice(dot);

  const gallery: ImageAsset[] = [primary];

  for (let i = 2; i <= MAX_GALLERY; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (resolvePublicImage(candidate)) {
      gallery.push({
        ...primary,
        src: candidate,
        alt: `${primary.alt} — view ${i}`,
      });
    }
  }

  return gallery;
}
