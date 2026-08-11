/**
 * Creates (or promotes) an admin user.
 *
 * Kept out of prisma/seed.ts on purpose: passwords must be hashed by Better
 * Auth itself, so this goes through the auth API rather than writing the
 * `account` row by hand. That also means the seed stays a pure data import and
 * does not need auth secrets to run.
 *
 *   pnpm admin:create -- --email you@example.com --password 'secret' --name 'Your Name'
 *   pnpm admin:create -- --email you@example.com --role manager
 *
 * Re-running for an existing email promotes that user's role instead of
 * failing, which is what you want when bootstrapping.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const ROLES = ["owner", "manager", "staff", "customer"] as const;
type Role = (typeof ROLES)[number];

/**
 * Explicitly annotated as `never` so TypeScript narrows through it. Calling
 * `process.exit()` inline does not narrow a `string | undefined` to `string`,
 * which is what forced non-null assertions here previously.
 */
function fail(message: string, hint?: string): never {
  console.error(message);
  if (hint) console.error(hint);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const email =
  arg("email") ??
  fail(
    "Missing --email",
    "  pnpm admin:create -- --email you@example.com --password 'secret'",
  );

const password = arg("password");
const name = arg("name") ?? "Store Owner";
const role = (arg("role") ?? "owner") as Role;

if (!ROLES.includes(role)) {
  fail(`Invalid --role '${role}'. One of: ${ROLES.join(", ")}`);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role, banned: false },
    });
    console.log(`Promoted existing user ${email} to '${role}'.`);
    return;
  }

  const newPassword =
    password ??
    fail(
      `No user with ${email} exists, so --password is required to create one.`,
    );

  if (newPassword.length < 8) {
    fail("Password must be at least 8 characters.");
  }

  // Imported lazily: pulling in the auth stack validates env, and the argument
  // errors above should fire first — they are far more actionable.
  const { auth } = await import("../src/lib/auth/index.ts");

  const result = await auth.api.signUpEmail({
    body: { email, password: newPassword, name },
  });

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role, emailVerified: true },
  });

  console.log(`Created ${email} with role '${role}'.`);
  console.log("Sign in at /admin/login");
}

main()
  .catch((e) => {
    console.error("Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
