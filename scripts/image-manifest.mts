/**
 * Emits IMAGE-PROMPTS.md — the artwork brief.
 *
 *   pnpm images:manifest
 *
 * Two kinds of image live in this project and the document keeps them apart:
 *
 *   • Banners  — no photo exists. These are what you generate from the prompts
 *                and drop into `public/`. This is the actionable list.
 *   • Products — a demo stand-in photo already ships (see `pnpm images:products`).
 *                The prompt doubles as a shoot brief for whoever replaces it
 *                with FlexOver's real product photography.
 *
 * Drop a file at the listed path and it goes live automatically. The extension
 * is a hint, not a contract — `resolvePublicImage()` matches on the base name,
 * so .jpg / .png / .webp all work.
 *
 * The leaf data modules are imported with explicit extensions because Node's
 * ESM resolver has no extension inference, and those leaves carry only
 * type-only imports, which type stripping erases.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { heroBanners, promoTiles, wideBanner } from "../src/data/banners.ts";
import { categories } from "../src/data/categories.ts";
import { products } from "../src/data/products.ts";
import type { ImageAsset } from "../src/data/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const EXTENSIONS = [".webp", ".avif", ".jpg", ".jpeg", ".png"];

/** Mirrors resolvePublicImage(): the declared extension is only a hint. */
function onDisk(asset: ImageAsset) {
  const rel = asset.src.replace(/^\/+/, "").split("/");
  const abs = path.join(publicDir, ...rel);
  if (existsSync(abs)) return true;
  const ext = path.extname(abs);
  const base = ext ? abs.slice(0, -ext.length) : abs;
  return EXTENSIONS.some((e) => e !== ext && existsSync(base + e));
}

const bannerAssets: { group: string; assets: ImageAsset[] }[] = [
  {
    group: "Hero banners",
    assets: heroBanners.flatMap((b) => [b.imageMobile, b.imageDesktop]),
  },
  {
    group: "Promo banners",
    assets: [...promoTiles, wideBanner].map((t) => t.image),
  },
];

const photoAssets: { group: string; assets: ImageAsset[] }[] = [
  { group: "Category tiles", assets: categories.map((c) => c.image) },
  { group: "Products", assets: products.map((p) => p.image) },
];

const banners = bannerAssets.flatMap((g) => g.assets);
const photos = photoAssets.flatMap((g) => g.assets);
const bannersDone = banners.filter(onDisk).length;
const photosDone = photos.filter(onDisk).length;

const lines: string[] = [
  "# FlexOver BD — Artwork Brief",
  "",
  `**Banners to generate: ${banners.length - bannersDone} of ${banners.length} still needed.**`,
  `Product & category photos: ${photosDone} of ${photos.length} in place (demo stand-ins).`,
  "",
  "## How to add an image",
  "",
  "1. Generate or shoot it at the stated pixel size.",
  "2. Save it at the exact path shown, creating folders as needed under `public/`.",
  "3. Refresh — it appears automatically. No code change needed.",
  "",
  "The file extension is flexible: `.jpg`, `.png` and `.webp` all work as long",
  "as the file name before the dot matches. Re-run `pnpm images:manifest` to",
  "see updated progress.",
  "",
  "---",
  "",
  "# Part 1 — Banners (generate these)",
  "",
  "No artwork exists for these yet. Feed the prompt to your image model.",
  "",
  "**Please keep two constraints.** Headlines and prices are never baked into",
  "the artwork — they are live HTML rendered on top of it, which keeps copy",
  "sharp on every screen, editable without regenerating an image, and readable",
  "by search engines. That is why each banner prompt asks for clean empty space",
  "on one side, and why every prompt ends with *no text, no logos, no",
  "watermark*. Artwork with text baked in will collide with the real headline.",
  "",
];

function section(assets: ImageAsset[], showSource: boolean) {
  for (const asset of assets) {
    lines.push(
      `### \`${asset.src}\` ${onDisk(asset) ? "— ✅ in place" : "— ⬜ needed"}`,
      "",
      `- **Size:** ${asset.width} × ${asset.height} px`,
      `- **Alt text:** ${asset.alt}`,
    );
    if (showSource && asset.demoSource) {
      lines.push(`- **Current file:** demo stand-in (\`${asset.demoSource}\`)`);
    }
    lines.push("", "```text", asset.prompt, "```", "");
  }
}

for (const { group, assets } of bannerAssets) {
  lines.push(
    `## ${group} (${assets.filter(onDisk).length}/${assets.length})`,
    "",
  );
  section(assets, false);
}

lines.push(
  "---",
  "",
  "# Part 2 — Product & category photos (replace when ready)",
  "",
  "These already have a photograph, so the site looks complete today. They are",
  "**demo stand-ins from a public prototyping dataset** — they are not FlexOver",
  "products and the licensing only covers prototyping, so every one of them",
  "must be replaced with your own product photography before launch.",
  "",
  "The prompt under each is a shoot brief: it describes the framing, lighting",
  "and background that will keep the grid looking consistent. Overwrite the",
  "file at the same path and the new photo goes live.",
  "",
);

for (const { group, assets } of photoAssets) {
  lines.push(
    `## ${group} (${assets.filter(onDisk).length}/${assets.length})`,
    "",
  );
  section(assets, true);
}

const outPath = path.join(root, "IMAGE-PROMPTS.md");
const { writeFileSync } = await import("node:fs");
writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(
  `IMAGE-PROMPTS.md written.\n` +
    `  Banners to generate : ${banners.length - bannersDone} of ${banners.length}\n` +
    `  Photos in place     : ${photosDone} of ${photos.length}`,
);
