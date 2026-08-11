/**
 * Copy every MediaAsset into the ImageKit account currently in `.env`.
 *
 * Assets restored from the backup still point at whichever account uploaded
 * them. They render only while that account is alive — the day it is closed
 * every image 404s, and `deleteMedia` already fails today because it
 * authenticates against the *new* account for a file that lives in the old one.
 *
 * ImageKit's upload API accepts a remote URL as the `file` parameter and
 * fetches it itself, so this needs no local download: point it at the old CDN
 * URL, let ImageKit pull it into the new account, then repoint the row.
 *
 * Safe to re-run. Assets already on the target endpoint are skipped, so an
 * interrupted run resumes rather than duplicating.
 *
 *   pnpm media:migrate            # migrate
 *   pnpm media:migrate --dry-run  # report what would move
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!ENDPOINT || !PRIVATE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT or IMAGEKIT_PRIVATE_KEY.",
  );
  process.exit(1);
}

const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");

/** `…/products/navy-shirt_AbC123.jpg` -> `navy-shirt_AbC123.jpg` */
function fileNameOf(url: string) {
  return decodeURIComponent(url.split("?")[0].split("/").pop() ?? "image.jpg");
}

/** `https://ik.imagekit.io/xxx/products/a.jpg` -> `products` */
function folderOf(url: string) {
  const parts = url.split("?")[0].split("/");
  // …/{imagekitId}/{folder}/{file}
  return parts.length >= 3 ? parts[parts.length - 2] : "";
}

async function migrate() {
  const assets = await prisma.mediaAsset.findMany({
    select: { id: true, url: true, alt: true, folder: true },
  });

  const stale = assets.filter((a) => !a.url.startsWith(ENDPOINT));
  console.log(
    `${assets.length} assets, ${stale.length} to migrate onto ${ENDPOINT}`,
  );
  if (DRY_RUN || stale.length === 0) return;

  let moved = 0;
  const failed: { id: string; url: string; reason: string }[] = [];

  for (const [i, asset] of stale.entries()) {
    const form = new FormData();
    // ImageKit fetches this URL server-side — no download needed here.
    form.append("file", asset.url);
    form.append("fileName", fileNameOf(asset.url));
    form.append("folder", asset.folder || folderOf(asset.url) || "migrated");
    // Keep the original name; ImageKit appends a suffix only on collision.
    form.append("useUniqueFileName", "true");

    try {
      const res = await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "POST",
          headers: { Authorization: `Basic ${auth}` },
          body: form,
        },
      );

      if (!res.ok) {
        failed.push({
          id: asset.id,
          url: asset.url,
          reason: `${res.status} ${(await res.text()).slice(0, 120)}`,
        });
        continue;
      }

      const uploaded = (await res.json()) as {
        fileId: string;
        url: string;
        thumbnailUrl?: string;
        width?: number;
        height?: number;
      };

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          imagekitId: uploaded.fileId,
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl ?? null,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
        },
      });

      moved += 1;
      if (moved % 20 === 0 || i === stale.length - 1) {
        console.log(`  ${moved}/${stale.length}`);
      }
    } catch (error) {
      failed.push({
        id: asset.id,
        url: asset.url,
        reason: (error as Error).message.slice(0, 120),
      });
    }
  }

  console.log(`\nmigrated ${moved}, failed ${failed.length}`);
  for (const f of failed.slice(0, 10)) {
    console.log(`  FAILED ${f.url} — ${f.reason}`);
  }
  if (failed.length) {
    console.log("\nRe-run to retry — migrated assets are skipped.");
  }
}

await migrate();
await prisma.$disconnect();
