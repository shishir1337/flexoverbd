/**
 * Downloads the demo product and category photography into `public/images/`.
 *
 *   pnpm images:products
 *
 * Source is DummyJSON — a public dataset of real e-commerce packshots built
 * for prototyping. Every asset that comes from it is tagged `demoSource` in
 * `src/data/`, so it is always obvious which images are stand-ins.
 *
 * THESE ARE PLACEHOLDERS. They exist so the client can judge layout, density
 * and rhythm with real photographs instead of grey boxes. Each one must be
 * replaced with FlexOver's own product photography before launch — both
 * because the licensing is only appropriate for prototyping and because they
 * are not the products FlexOver actually sells.
 *
 * Files land at the path declared in the data, with whatever extension the
 * source serves. `resolvePublicImage()` matches on the base name, so a `.webp`
 * on disk satisfies a `.jpg` declared in the data — and so will the client's
 * own `.jpg` or `.png` when it replaces it.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "../src/data/categories.ts";
import { products } from "../src/data/products.ts";
import type { ImageAsset } from "../src/data/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

type Target = { asset: ImageAsset; label: string; gallery: boolean };

const targets: Target[] = [
  // Category tiles only ever show one image; products get a gallery.
  ...categories.map((c) => ({
    asset: c.image,
    label: `category/${c.slug}`,
    gallery: false,
  })),
  ...products.map((p) => ({
    asset: p.image,
    label: `product/${p.slug}`,
    gallery: true,
  })),
];

const needed = targets.filter((t) =>
  t.asset.demoSource?.startsWith("dummyjson:"),
);

console.log(`Fetching ${needed.length} demo images…\n`);

// One catalogue request, then one image request each — rather than a lookup
// per asset.
const res = await fetch(
  "https://dummyjson.com/products?limit=0&select=id,images,thumbnail",
);
if (!res.ok) throw new Error(`Catalogue fetch failed: ${res.status}`);
const catalogue = (await res.json()) as {
  products: { id: number; images: string[]; thumbnail: string }[];
};
const byId = new Map(catalogue.products.map((p) => [p.id, p]));

let ok = 0;
const failures: string[] = [];

/** Gallery shots live beside the primary image as `-2`, `-3`, `-4`. */
const MAX_GALLERY = 4;

function destinationFor(assetSrc: string, remoteUrl: string, index: number) {
  // Keep the source extension; the ".jpg" in the data is only a hint, and
  // resolvePublicImage() matches on the base name.
  const ext = path.extname(new URL(remoteUrl).pathname) || ".jpg";
  const parts = assetSrc.replace(/^\/+/, "").split("/");
  const base = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  parts[parts.length - 1] =
    index === 0 ? base + ext : base + "-" + (index + 1) + ext;
  return parts;
}

for (const { asset, label, gallery } of needed) {
  const id = Number(asset.demoSource?.split(":")[1]);
  const entry = byId.get(id);

  if (!entry) {
    failures.push(label + " — no catalogue entry for id " + id);
    continue;
  }

  const sources = (entry.images?.length ? entry.images : [entry.thumbnail])
    .filter(Boolean)
    .slice(0, gallery ? MAX_GALLERY : 1);

  if (sources.length === 0) {
    failures.push(label + " — catalogue entry " + id + " has no image");
    continue;
  }

  let saved = 0;
  let bytesTotal = 0;

  for (const [index, remote] of sources.entries()) {
    try {
      const img = await fetch(remote);
      if (!img.ok) throw new Error("HTTP " + img.status);
      const bytes = Buffer.from(await img.arrayBuffer());

      const parts = destinationFor(asset.src, remote, index);
      const dest = path.join(publicDir, ...parts);
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, bytes);

      saved++;
      bytesTotal += bytes.length;
    } catch (err) {
      failures.push(
        label + " [" + (index + 1) + "] — " + (err as Error).message,
      );
    }
  }

  if (saved > 0) {
    ok++;
    console.log(
      "  ✓ " +
        label.padEnd(46) +
        saved +
        " img " +
        (bytesTotal / 1024).toFixed(0).padStart(5) +
        " KB",
    );
  }
}

console.log(`\nDone: ${ok}/${needed.length} downloaded.`);

if (failures.length) {
  console.log(`\n${failures.length} failed:`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exitCode = 1;
}
