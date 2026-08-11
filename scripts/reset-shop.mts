/**
 * Clears all shop content so the admin can be exercised from an empty store.
 *
 * DESTRUCTIVE. Run `pnpm backup:shop` first — it writes every table to
 * `_backup/flexover-full-backup.json`, which is what makes this reversible.
 *
 * Deliberately does NOT touch:
 *   - User / Session / Account — you would lock yourself out of the admin.
 *   - Division / District      — Bangladesh geography has no admin screen that
 *                                could recreate it, and checkout needs it.
 *   - DeliveryZone / Setting / NavLink / FaqItem — all editable in the admin,
 *                                so they are better tested by editing than by
 *                                deleting and having no way back.
 *
 * Pass --yes to skip the confirmation prompt.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Child rows first, so a foreign key never blocks a delete even where the
 * schema declares no cascade.
 */
const ORDER = [
  "reviewScreenshot",
  "review",
  "couponRedemption",
  "coupon",
  "flashSaleItem",
  "flashSaleCampaign",
  "stockMovement",
  "orderEvent",
  "orderItem",
  "order",
  "cartItem",
  "cart",
  "wishlistItem",
  "address",
  "productImage",
  "productVariant",
  "slugHistory",
  "product",
  "subcategory",
  "category",
  "brand",
  "banner",
  "announcement",
  "trendingSearch",
  "trustItem",
  "page",
  "newsletterSubscriber",
  "mediaAsset",
  "adminAuditLog",
] as const;

/**
 * Everything else, behind `--everything`.
 *
 * These are separate because none of them can be recreated from the admin:
 * geography has no screen at all, and wiping DeliveryZone leaves checkout with
 * no fee to charge. Restore them with `pnpm shop:restore` when you want the
 * shop working again.
 *
 * District before Division and DeliveryZone — it points at both.
 */
const DEEP = [
  "district",
  "division",
  "deliveryZone",
  "setting",
  "navLink",
  "faqItem",
] as const;

async function main() {
  const deep = process.argv.includes("--everything");
  const targets = deep ? [...ORDER, ...DEEP] : [...ORDER];

  const counts: Record<string, number> = {};
  for (const m of targets) {
    counts[m] = await (
      prisma as never as Record<string, { count(): Promise<number> }>
    )[m].count();
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  console.log(`About to delete ${total} rows:`);
  for (const [m, n] of Object.entries(counts))
    if (n > 0) console.log(`  ${m}: ${n}`);

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('\nType "wipe" to confirm: ');
    rl.close();
    if (answer.trim() !== "wipe") {
      console.log("Cancelled. Nothing was deleted.");
      return;
    }
  }

  for (const m of targets) {
    const { count } = await (
      prisma as never as Record<
        string,
        { deleteMany(a: object): Promise<{ count: number }> }
      >
    )[m].deleteMany({});
    if (count > 0) console.log(`cleared ${m}: ${count}`);
  }

  console.log(
    "\nKEPT",
    JSON.stringify({
      user: await prisma.user.count(),
      division: await prisma.division.count(),
      district: await prisma.district.count(),
      deliveryZone: await prisma.deliveryZone.count(),
      setting: await prisma.setting.count(),
      navLink: await prisma.navLink.count(),
      faqItem: await prisma.faqItem.count(),
    }),
  );

  if (deep) {
    console.log(
      "\nGeography and settings are gone. Checkout cannot price delivery until\n" +
        "they are back — run `pnpm shop:restore` to reload them from the backup.",
    );
  }
}

await main();
await prisma.$disconnect();
