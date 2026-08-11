import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { ac, roles } from "./permissions";

/**
 * Better Auth configuration.
 *
 * Email + password for now — the client chose it over phone OTP, which also
 * means no SMS provider is on the critical path to launch. `phone` still exists
 * on the User model because every order carries one and support looks customers
 * up by it.
 *
 * Guest checkout remains the default on the storefront; an account is optional
 * and only buys you saved addresses and order history.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // Email delivery is Phase 8. Until a provider is wired, requiring
    // verification would lock every new customer out of their own account.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
    cookieCache: {
      // Avoids a DB round-trip for the session on every RSC render. Short
      // enough that a ban or role change takes effect within the minute.
      enabled: true,
      maxAge: 60,
    },
  },

  plugins: [
    admin({
      ac,
      roles,
      defaultRole: "customer",
      adminRoles: ["owner", "manager", "staff"],
    }),
    // Must stay last: it lets Server Actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
