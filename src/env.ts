import { z } from "zod";

/**
 * Environment contract.
 *
 * Parsed once, at import time, so a missing secret fails the build or the boot
 * — not a customer's checkout. Every server module reads `env`, never
 * `process.env` directly.
 *
 * Client-visible values are separated deliberately: anything in `clientSchema`
 * is inlined into the browser bundle by Next, so a secret must never be added
 * there.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL must be a postgres:// or postgresql:// URL",
    }),

  /** Unpooled endpoint, used only by `prisma migrate`. */
  DIRECT_URL: z.string().optional(),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 chars (npx auth secret)"),
  BETTER_AUTH_URL: z.url(),

  /**
   * ImageKit. Optional so the app still boots without it — uploads are simply
   * unavailable, which the Media screen says out loud rather than failing at
   * the moment someone picks a file.
   *
   * The private key signs upload tokens and must never reach the browser. It is
   * deliberately *not* mirrored as a NEXT_PUBLIC_ value.
   */
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z.string().optional(),
});

function parse<T extends z.ZodType>(schema: T, source: unknown, label: string) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid ${label} environment variables:\n${issues}\n\n` +
        `Copy .env.example to .env and fill these in.`,
    );
  }
  return result.data as z.infer<T>;
}

// Next inlines `process.env.NEXT_PUBLIC_*` only when referenced statically, so
// these are listed out rather than spread from process.env.
const clientEnv = parse(
  clientSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT:
      process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  },
  "client",
);

// Server variables are absent in the browser bundle; only validate on the
// server, or every client component import would throw.
const serverEnv =
  typeof window === "undefined"
    ? parse(serverSchema, process.env, "server")
    : ({} as z.infer<typeof serverSchema>);

export const env = { ...clientEnv, ...serverEnv };
