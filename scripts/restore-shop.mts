/**
 * Reloads tables from `_backup/flexover-full-backup.json`.
 *
 *   pnpm shop:restore              # geography + settings only (the default)
 *   pnpm shop:restore --all        # every table in the backup
 *   pnpm shop:restore division district
 *
 * The default is the narrow one on purpose: the usual reason to run this is
 * that `shop:reset --everything` took out the delivery zones and checkout can
 * no longer price an order. That does not mean you want 62 demo products back.
 *
 * Rows are inserted with `skipDuplicates`, so running it twice is harmless and
 * it will never overwrite something you have since created by hand.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Parents before children — the reverse of the delete order. */
const ALL = [
  "user",
  "account",
  "division",
  "deliveryZone",
  "district",
  "setting",
  "navLink",
  "faqItem",
  "mediaAsset",
  "brand",
  "category",
  "subcategory",
  "product",
  "productVariant",
  "productImage",
  "slugHistory",
  "banner",
  "announcement",
  "trendingSearch",
  "trustItem",
  "page",
  "coupon",
  "flashSaleCampaign",
  "flashSaleItem",
  "newsletterSubscriber",
  "address",
  "order",
  "orderItem",
  "orderEvent",
  "stockMovement",
  "review",
  "reviewScreenshot",
  "adminAuditLog",
] as const;

/** What a broken checkout actually needs back. */
const ESSENTIAL = [
  "division",
  "deliveryZone",
  "district",
  "setting",
  "navLink",
  "faqItem",
] as const;

const backup = JSON.parse(
  readFileSync("../_backup/flexover-full-backup.json", "utf8"),
) as Record<string, Record<string, unknown>[]>;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = process.argv.includes("--all")
  ? ALL
  : args.length > 0
    ? (args as unknown as typeof ALL)
    : ESSENTIAL;

for (const model of targets) {
  const rows = backup[model];
  if (!rows?.length) continue;

  // Dates come back from JSON as strings; Prisma wants Date objects.
  const revived = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)
          ? new Date(v)
          : v,
      ]),
    ),
  );

  try {
    const { count } = await (
      prisma as never as Record<
        string,
        { createMany(a: object): Promise<{ count: number }> }
      >
    )[model].createMany({ data: revived, skipDuplicates: true });
    console.log(`restored ${model}: ${count}/${rows.length}`);
  } catch (e) {
    console.error(`FAILED ${model}: ${(e as Error).message.slice(0, 140)}`);
  }
}

await prisma.$disconnect();
