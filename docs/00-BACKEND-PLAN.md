# FlexOver BD — Backend & Admin Plan

**Status:** Draft for review · **Date:** 2026-08-04
**Author:** Engineering
**Companion docs:** [`01-DATA-MODEL.md`](./01-DATA-MODEL.md) · [`02-ADMIN-SCOPE.md`](./02-ADMIN-SCOPE.md)

---

## 1. Goal

Turn the approved frontend into a fully functional store, where **every piece of
content, configuration and commerce logic is editable from an admin panel** —
no code deploy needed to change a price, a banner, a delivery fee, a policy
page, or the phone number in the footer.

Two constraints drive most decisions below:

- **98% of shoppers are on phones.** Every byte on the storefront read path
  matters. The admin panel is desktop-first and can be heavier.
- **Cash on delivery dominates.** Orders are not "paid then fulfilled" — they
  are "placed, confirmed by phone, then shipped". The order model has to carry
  a confirmation step and a cancellation/return path that COD makes common.

---

## 2. Where we are today

### 2.1 What is real

23 routes, 116 crawlable pages, all server-rendered. Full purchase journey works
end to end: PDP → variant selection → cart → district-based delivery pricing →
guest checkout → order confirmation → tracking. SEO is complete (unique
title/description/canonical per page, JSON-LD on products and listings,
sitemap, robots). Verified: 0 broken links, no horizontal overflow at
320–1280px, no console errors, WCAG touch targets met.

### 2.2 What is mock

| Concern | Today | Lives in |
|---|---|---|
| Catalogue | 62 products, 8 categories, 30 subcategories as TS literals | `src/data/products.ts` (1,574 lines), `categories.ts` |
| Product copy | Derived from category templates | `src/data/product-detail.ts` |
| Banners / promos | 3 hero + promo tiles + wide banner | `src/data/banners.ts` |
| Reviews | 6 named + 4 generic, rotated by product hash | `src/data/reviews.ts` |
| Site config | Brand, contact, social, delivery fees, payment methods | `src/lib/site.ts` |
| Districts | 64 districts, 8 divisions, zone lookup | `src/data/districts.ts` |
| Announcements, trending searches | Const arrays | `src/data/index.ts` |
| **Cart** | `localStorage` — `flexover.cart.v2` | `cart-context.tsx` |
| **Wishlist** | `localStorage` — `flexover.wishlist.v1` | `wishlist-context.tsx` |
| **Orders** | `localStorage` — `flexover.orders.v1`, status derived from elapsed time | `src/lib/orders.ts` |
| Page copy | Hardcoded JSX arrays | `about`, `faq`, `contact`, `privacy`, `terms`, `shipping`, `refund-policy` |
| Footer / menu links | Const arrays | `site-footer.tsx`, `mobile-menu.tsx` |
| Trust strip, stats | Const arrays | `trust-strip.tsx`, `reviews.ts` |
| Images | Files under `public/`, resolved at build time | `src/lib/public-files.ts` |

**Consequence:** every one of these becomes a table plus an admin screen. The
inventory is enumerated exhaustively in [`02-ADMIN-SCOPE.md`](./02-ADMIN-SCOPE.md).

### 2.3 What is already backend-shaped (and should be preserved)

These were deliberately built so the backend swap is a data-source change, not
a rewrite:

- `Product`, `Category`, `Banner`, `Review` types in `src/data/types.ts` map
  almost 1:1 to tables.
- **One dynamic PDP template** (`/product/[slug]`) — not 62 pages.
- **`src/lib/listing.ts`** — filtering/sorting is URL-driven and already
  expressed as predicates; it becomes a Prisma `where`/`orderBy` builder.
- **`src/lib/variants.ts`** — variant identity (`p-001::colour:Navy::size:M`)
  already models what will become a `ProductVariant` row with a real SKU.
- **`resolvePublicImage()`** is the single image indirection point → becomes
  the ImageKit URL builder.
- Build-time guards (`assertSubcategories`, `assertTrendingSearches`) encode
  invariants that become DB constraints.

### 2.4 Known gaps the backend must close

1. **Stock is decorative.** `product.stock` is displayed but never decremented.
   Needs per-variant stock with atomic reservation at checkout.
2. **Order status is fake.** `derivedStatus()` advances a stage every 12h.
   Needs real status transitions written by admins.
3. **Orders are device-local.** Tracking only works on the phone that ordered.
4. **No stock/price integrity at checkout.** The client sends prices; the
   server must recompute from the DB and reject mismatches.
5. **Rating/review counts are static numbers**, not aggregates of real reviews.

---

## 3. Target architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Storefront (public)                                            │
│  RSC pages · `use cache` + cacheTag · Server Actions for cart   │
└───────────────┬─────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│  Domain layer  src/server/                                      │
│  services/ (catalog, cart, checkout, orders, content, settings)  │
│  Zod schemas · authorization guards · cache tag helpers          │
└───────────────┬─────────────────────────────────────────────────┘
                │
        ┌───────▼────────┐   ┌──────────────┐   ┌─────────────────┐
        │ Prisma 7 + pg  │   │ Better Auth  │   │ ImageKit        │
        │ PostgreSQL     │   │ sessions/RBAC│   │ media + CDN     │
        └────────────────┘   └──────────────┘   └─────────────────┘
                ▲
┌───────────────┴─────────────────────────────────────────────────┐
│  Admin panel  /admin  (own layout, desktop-first, noindex)      │
│  Server Actions for all mutations · audit log on every write    │
└─────────────────────────────────────────────────────────────────┘
```

**Rule: the storefront never imports Prisma directly.** Pages call
`src/server/services/*`, which own caching, validation and authorization. This
keeps one place to change when a query needs a tag, an index, or a permission
check.

### 3.1 Server Actions vs Route Handlers

| Use | Mechanism | Why |
|---|---|---|
| Cart add/update/remove, wishlist | Server Action | Progressive enhancement, no client fetch layer |
| Checkout / place order | Server Action | Needs transaction + revalidation |
| All admin CRUD | Server Action | Co-located with forms, typed end to end |
| ImageKit upload auth | Route Handler `GET /api/upload-auth` | Called by the ImageKit browser SDK |
| Better Auth | Route Handler `/api/auth/[...all]` | Required by the library |
| Webhooks (payment, courier) | Route Handler | External callers, raw body + signature |
| Health / cron | Route Handler | External callers |

Server Actions are the default. Route Handlers only where a **non-browser or
third-party caller** requires a URL.

> ⚠️ Server Actions are public HTTP endpoints. Every action must re-check
> authorization and re-validate input with Zod — never trust that the UI only
> rendered the button for admins.

### 3.2 Caching strategy — Cache Components

Next.js 16.3 ships **Cache Components** (`cacheComponents: true`), which makes
data fetching dynamic by default and lets us cache explicitly. This suits a
storefront where a static shell must stream fast on 4G but an admin edit must
appear immediately.

```ts
// src/server/services/catalog.ts
import { cacheTag, cacheLife } from 'next/cache'

export async function getProductBySlug(slug: string) {
  'use cache'
  cacheTag(`product:${slug}`, 'products')
  cacheLife('hours')
  return prisma.product.findUnique({ where: { slug }, include: { ... } })
}
```

Invalidation from an admin Server Action:

```ts
'use server'
await prisma.product.update({ ... })
updateTag(`product:${slug}`)   // read-your-own-writes: admin sees it instantly
revalidateTag('products')      // storefront listings refresh in background
```

- **`updateTag`** — Server Actions only. Expires immediately; the next request
  waits for fresh data. Use for the entity the admin just edited.
- **`revalidateTag`** — Actions and Route Handlers. Serves stale while
  refreshing. Use for broad collections.

**Tag taxonomy** (kept in one file, `src/server/cache-tags.ts`):

| Tag | Invalidated by |
|---|---|
| `products`, `product:{slug}` | product create/update/delete, stock, price |
| `categories`, `category:{slug}` | category/subcategory changes |
| `banners`, `announcements`, `trending` | merchandising changes |
| `settings` | any site/commerce setting |
| `content:{slug}` | CMS page edit |
| `reviews:{productId}` | review approve/reject |

> Cookies and headers cannot be read inside a `use cache` scope. Read them
> outside and pass values as arguments — cart and session are per-user and stay
> uncached (or use `'use cache: private'` only where genuinely needed).

---

## 4. Stack — pinned versions

Verified against npm on 2026-08-04.

| Package | Version | Role |
|---|---|---|
| `next` | **16.3.0** (installed) | Framework |
| `react` / `react-dom` | 19.2.4 (installed) | UI |
| `prisma` / `@prisma/client` | **7.9.1** | ORM |
| `@prisma/adapter-pg` | 7.9.1 | Driver adapter (**mandatory in v7**) |
| `pg` | ^8 | Postgres driver |
| `better-auth` | **1.6.25** | Auth, sessions, RBAC |
| `@imagekit/next` | **2.1.5** | Image component + browser upload |
| `imagekit` | 6.0.0 | Server SDK (delete, list, metadata) |
| `zod` | 4.4.3 | Validation at every boundary |
| `react-hook-form` | 7.84.0 | Admin forms |
| `@tanstack/react-table` | 9.0.0 | Admin data tables |
| `nuqs` | 2.9.4 | URL state for admin filters |

### 4.1 Prisma 7 — breaking changes that affect us

Prisma 7 is a significant departure from v6. These are not optional:

1. **Generator is `prisma-client`, not `prisma-client-js`**, and `output` is
   **required** — the client is no longer emitted into `node_modules`.
2. **`prisma.config.ts` at the project root** now owns the datasource URL,
   migrations path and seed command.
3. **Driver adapters are mandatory** — `PrismaPg` for Postgres.
4. **Ships as ESM**; `"type": "module"` in `package.json`.
5. **`prisma migrate dev` no longer auto-seeds**; run `prisma db seed`.
6. **Env vars are not auto-loaded** — `import "dotenv/config"` in the config.

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

```ts
// src/lib/prisma.ts — singleton, survives HMR
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Also required in `next.config.ts`:

```ts
serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
```

> 🔴 **Known risk — Prisma 7 + Next 16 + Turbopack.** There are reported
> `Cannot find module '.prisma/client/default'` failures on this exact
> combination, caused by the new custom-output/ESM layout. **Mitigation:** the
> very first task in Phase 0 is a throwaway spike proving `prisma generate` →
> import → query works under `next dev` *and* `next build` before any schema
> work. If it does not, fall back to Prisma 6.16 (still fully supported, no
> `prisma.config.ts` requirement) and revisit v7 later. This is a go/no-go gate.

> ⚠️ **`"type": "module"` side effect.** The repo has `scripts/*.mts` run via
> `node --experimental-strip-types` and `allowImportingTsExtensions`. Switching
> the package to ESM needs those re-verified in the same spike.

### 4.2 Better Auth

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [admin({ ac, roles })],
});
```

`npx auth generate` writes `User`, `Session`, `Account`, `Verification` into the
Prisma schema; the `admin` plugin adds `role`, `banned`, `banReason`,
`banExpires` and impersonation support.

Route handler: `src/app/api/auth/[...all]/route.ts` →
`export const { POST, GET } = toNextJsHandler(auth)`.

**Roles** via `createAccessControl`:

| Role | Capability |
|---|---|
| `owner` | Everything, including settings, staff and destructive actions |
| `manager` | Catalogue, orders, content, marketing. No staff/settings |
| `staff` | Orders only: confirm, update status, add notes |
| `customer` | Storefront only (default for shoppers) |

Server-side check in every admin action:

```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/admin/login");
await requirePermission(session, { product: ["update"] });
```

### 4.3 ImageKit

```ts
// src/app/api/upload-auth/route.ts
import { getUploadAuthParams } from "@imagekit/next/server";

export async function GET() {
  // Gate this — otherwise anyone can mint upload credentials.
  await requireAdmin();
  const { token, expire, signature } = getUploadAuthParams({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  });
  return Response.json({ token, expire, signature,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
}
```

- Browser uploads go **direct to ImageKit** — files never transit our server.
- The private key stays server-side only.
- Every upload is recorded in a `MediaAsset` row (fileId, path, dimensions,
  alt) so the admin has a real media library and we can delete from ImageKit
  when an asset is removed.
- `<Image>` from `@imagekit/next` replaces the current `<Media>` internals;
  `resolvePublicImage()` becomes `buildSrc()`. **The `<Media>` component's
  public API does not change**, so call sites stay as they are.

---

## 5. Delivery phases

Ordered so the storefront keeps working at every step. Estimates are
engineering days for one developer.

### Phase 0 — Foundations · ~3d
- **Spike: Prisma 7 + Next 16 + Turbopack go/no-go** (§4.1) ← blocks everything
- Postgres provisioned (dev + staging + prod), connection pooling
- Prisma installed, `prisma.config.ts`, client singleton, first migration
- `.env` contract + `src/env.ts` (Zod-validated env, fails fast at boot)
- CI: typecheck, lint, build, `prisma migrate deploy`

**Exit:** `prisma studio` opens, app builds and queries a table.

### Phase 1 — Auth & RBAC · ~3d
- Better Auth + Prisma adapter + admin plugin, roles/permissions
- `/admin/login`, session in RSC, route protection via layout guard
- Seed the first owner account
- Customer accounts on the storefront (optional — guest checkout stays default)

**Exit:** an owner can log in; `/admin` is inaccessible to everyone else.

### Phase 2 — Media · ~2d
- ImageKit account/folders, env wiring, gated upload-auth route
- `MediaAsset` model + media library screen (upload, search, alt text, delete)
- `<Media>` switched to ImageKit URLs behind the existing API

**Exit:** an image uploaded in admin renders on the storefront.

### Phase 3 — Catalogue read path · ~5d
- Schema: brands, categories, subcategories, products, variants, images
- **Migration script: `src/data/*.ts` → database** (all 62 products, 8
  categories, 30 subcategories, banners, reviews, districts) — idempotent, re-runnable
- `src/server/services/catalog.ts` with `use cache` + tags
- Pages switched from `@/data` imports to services; `src/data` deleted last
- `listing.ts` predicates → Prisma `where`/`orderBy`

**Exit:** storefront renders entirely from Postgres; visual diff vs today is nil.

### Phase 4 — Admin: catalogue · ~6d
- Admin shell: nav, breadcrumbs, data tables, form patterns, toasts
- Products CRUD incl. variants matrix, images, SEO, badges, flash sale
- Categories/subcategories with drag ordering; brands
- Bulk actions: publish, price change, stock adjust, CSV import/export
- Audit log written on every mutation

**Exit:** a product can be created in admin and bought on the storefront.

### Phase 5 — Cart, checkout, orders · ~6d
- Server-side cart (guest cookie token → merged into account on login)
- Checkout Server Action in a transaction:
  **recompute prices server-side**, validate stock, reserve, create order,
  decrement stock, emit `OrderEvent`
- Order number generator (keep `FB-YYMMDD-XXXX`)
- Tracking by order number **or phone**, server-backed (fixes device-local bug)
- Stock movements ledger

**Exit:** a real order exists in the DB with correct totals and stock deducted.

### Phase 6 — Admin: orders · ~4d
- Order list with filters (status, date, district, payment, search)
- Order detail: items, customer, address, timeline, internal notes
- Status transitions with guards; cancel/refund path; stock restoration
- Print-friendly invoice / packing slip
- Optional: courier CSV export

**Exit:** staff can run the full COD fulfilment loop.

### Phase 7 — Admin: content & configuration · ~6d
Everything in [`02-ADMIN-SCOPE.md`](./02-ADMIN-SCOPE.md): site identity,
contact, social, commerce rules, delivery zones & 64 districts, payment method
toggles, banners/hero, promo tiles, announcements, trending searches, trust
strip, footer/menu links, CMS pages with a block editor, FAQ, reviews
moderation + screenshot wall, store stats, SEO defaults, theme tokens.

**Exit:** no user-visible string or number requires a deploy to change.

### Phase 8 — Marketing & comms · ~4d
- Coupons (percent/fixed/free-delivery, min spend, usage caps, windows)
- Newsletter subscribers + export
- Transactional notifications: order placed / confirmed / shipped / delivered
  (email now, SMS when a provider is chosen)
- Abandoned-cart list

### Phase 9 — Hardening & launch · ~4d
- Rate limiting on auth, checkout, coupon validation, upload-auth
- Backups + restore drill; migration rollback plan
- Observability: error tracking, slow-query log, uptime
- Load check on listing/PDP; index review
- Security pass: authorization on every action, CSRF posture, secrets audit
- Final data import of real catalogue; 301 map if any slugs change

**Total: ~43 engineering days (~9 weeks solo).** Phases 3–7 can partly
parallelise with a second developer (admin UI vs storefront read path).

---

## 6. Non-negotiables

1. **Never trust client prices.** Checkout recomputes every line from the DB.
2. **Every Server Action re-checks auth + Zod-validates input.**
3. **Order line items are snapshots** (title, price, variant label, image) —
   editing a product must not rewrite history.
4. **Stock changes go through the ledger**, never a bare `update`.
5. **`/admin` is `noindex, nofollow`** and excluded from the sitemap.
6. **Audit log on every admin mutation** — who, what, before, after.
7. **Storefront read path stays server-rendered and cached.** No client-side
   data fetching on catalogue pages; the mobile budget will not take it.
8. **Migrations are forward-only and reviewed**; no `db push` outside dev.

---

## 7. Decisions needed from the client

These block specific phases — worth answering before we start.

| # | Question | Blocks | Recommendation |
|---|---|---|---|
| 1 | Hosting for app + Postgres? | Phase 0 | Vercel + Neon (managed, pooled, cheap to start) |
| 2 | Do customers log in by **phone OTP** or email/password? | Phase 1 | Phone OTP — matches BD norms; needs an SMS provider |
| 3 | SMS provider? (SSLWireless / Alpha SMS / Bulk SMS BD) | Phase 1, 8 | Client picks; affects OTP + order notifications |
| 4 | Email provider for receipts? | Phase 8 | Resend — simple, good deliverability |
| 5 | Courier integration now or manual? (Pathao / Steadfast / RedX) | Phase 6 | Start manual + CSV export; integrate after launch |
| 6 | Online payment after COD? (bKash / SSLCommerz / Nagad) | Post-launch | Model `paymentMethod` + `paymentStatus` now, integrate later |
| 7 | Who gets admin access, and at what role? | Phase 1 | Owner + 1 manager to start |
| 8 | Multi-language (Bangla) needed? | Schema-wide | **Decide now** — retrofitting translated fields is expensive |
| 9 | Real product data source — CSV, existing system, or manual entry? | Phase 3 | Determines whether we build an importer |
| 10 | Keep the 62 demo products as seed data for staging? | Phase 3 | Yes, useful for QA |

> **Question 8 is the one that hurts most if deferred.** Bilingual support means
> either translated columns or a translations table on ~15 entities. Adding it
> later is a schema-wide migration plus every admin form.

---

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Prisma 7 + Turbopack incompatibility | Blocks Phase 0 | Spike first; documented fallback to Prisma 6.16 |
| `"type": "module"` breaks existing `.mts` scripts | Build tooling | Covered in the same spike |
| "Everything configurable" scope creep | Timeline | Scope frozen in `02-ADMIN-SCOPE.md`; anything new is a change request |
| Over-configurable = unusable admin | Adoption | Group rarely-changed settings under "Advanced"; sensible defaults everywhere |
| Cache tags missed → stale storefront | Data correctness | Single `cache-tags.ts`; a service may not query without a tag (lint rule) |
| Image migration from `public/` to ImageKit | Broken images | Keep the `<Media>` fallback placeholder; migrate behind a flag |
| Losing SEO on slug changes | Traffic | Slug history table + 301s; never hard-delete a slug |
| Stock race on flash sales | Oversell | Row-level lock / conditional update in the checkout transaction |

---

## 9. Environment contract

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/flexover?sslmode=require
DIRECT_URL=                      # unpooled, for migrations

# Auth
BETTER_AUTH_SECRET=              # npx auth@latest secret
BETTER_AUTH_URL=https://www.flexoverbd.com

# ImageKit
IMAGEKIT_PRIVATE_KEY=            # server only, never NEXT_PUBLIC
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/flexoverbd

# App
NEXT_PUBLIC_SITE_URL=https://www.flexoverbd.com
```

All validated at boot by `src/env.ts` (Zod) so a missing secret fails the build,
not a customer's checkout.

---

## 10. Immediate next steps

1. Client answers §7 — especially **Q8 (Bangla)** and **Q2 (phone vs email)**.
2. Run the **Prisma 7 spike** (§4.1). Go/no-go on the ORM version.
3. Provision Postgres + ImageKit accounts.
4. Review [`01-DATA-MODEL.md`](./01-DATA-MODEL.md) — the schema is the contract
   everything else is built against, and it is cheapest to change now.
