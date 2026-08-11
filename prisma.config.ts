import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the DIRECT (unpooled) endpoint. Neon's pooler is PgBouncer
    // in transaction mode, which cannot hold the advisory locks or session
    // state `prisma migrate` depends on — running migrations through it fails
    // intermittently and confusingly. The app itself uses the pooled
    // DATABASE_URL, which is what a serverless runtime should hold.
    url: env("DIRECT_URL"),
  },
});
