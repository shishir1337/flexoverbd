# FlexOver BD — Admin Panel Scope

**Status:** Draft for review · Companion to [`00-BACKEND-PLAN.md`](./00-BACKEND-PLAN.md)

The brief was "everything configurable — and when I say everything, I mean
everything." This document is the literal inventory: every string, number,
image and behaviour currently hardcoded in the frontend, and where it will be
edited.

**This list is the scope contract.** Anything not on it is a change request.

Legend — **P** = delivery phase from the main plan.

---

## 1. Admin information architecture

```
/admin
├── Dashboard              KPIs, recent orders, low stock, pending reviews
├── Orders                 list · detail · fulfilment · invoices
├── Catalogue
│   ├── Products           CRUD · variants · images · SEO · bulk actions
│   ├── Categories         + subcategories, ordering
│   ├── Brands
│   ├── Inventory          stock by variant, movements ledger, low-stock
│   └── Flash Sales        campaigns, scheduling
├── Customers              accounts, addresses, order history, ban
├── Marketing
│   ├── Coupons
│   ├── Newsletter
│   └── Abandoned carts
├── Content
│   ├── Banners            hero carousel · promo tiles · wide banner
│   ├── Announcements      the top bar messages
│   ├── Pages              about · privacy · terms · shipping · returns · contact
│   ├── FAQ
│   ├── Reviews            moderation queue
│   ├── Screenshot wall    homepage social proof (+ consent gate)
│   └── Navigation         footer columns · mobile menu · trending searches
├── Media                  ImageKit library, alt text, replace, delete
├── Settings
│   ├── Store identity     name, logo, tagline, descriptions
│   ├── Contact            phone, WhatsApp, email, address, hours
│   ├── Social             Facebook, Instagram, WhatsApp
│   ├── Commerce           free-shipping threshold, return window, COD toggle
│   ├── Delivery           zones, 64 districts, fees, ETAs
│   ├── Payments           method list, enable/disable, logos
│   ├── SEO                default meta, OG image, robots, verification tags
│   ├── Theme              brand colours, radius, fonts
│   └── Staff              admin users, roles, permissions
└── System                 audit log, cache tools, import/export
```

---

## 2. Settings — currently `src/lib/site.ts`

Every field below is hardcoded today and becomes a form field. **P7** unless noted.

### 2.1 Store identity
| Field | Current value |
|---|---|
| Name | FlexOver BD |
| Legal name | FlexOver BD |
| Tagline | Everything you need, delivered better. |
| Short description | Your Trusted Online Shopping Destination |
| Full description | Shop fashion, gadgets, home essentials… |
| Site URL | https://www.flexoverbd.com |
| Logo / icon | `/icon.jpg` |
| Favicon, app icons, OG fallback | derived |
| Locale / country / currency / symbol | en_BD · Bangladesh · BDT · ৳ |

### 2.2 Contact
Phone (display + `tel:` href), WhatsApp number, WhatsApp prefilled message,
support email, address, business hours.
> The WhatsApp number appears in the header, footer, FAB, mobile menu, PDP order
> button and order-help links — **one setting, six render sites.**

### 2.3 Social
Facebook, Instagram, WhatsApp URLs. Admin can add/remove/reorder platforms.

### 2.4 Commerce rules
| Setting | Current |
|---|---|
| Free-shipping threshold | ৳2,000 |
| Return window (days) | 7 |
| COD enabled | true |
| Min / max order value | *(new)* |
| Max qty per line | 10 (hardcoded in buy box) |
| Low-stock threshold | 20 ("Only N left") |
| Order number prefix | `FB-` |

### 2.5 Delivery — **P7**
- Zones: name, fee, ETA label, ordering (currently Inside ৳70 / Outside ৳130)
- All 64 districts: zone assignment, per-district fee override, enable/disable
- Free-delivery override per product *(exists)* and per category *(new)*

### 2.6 Payments
Method list (COD, bKash, Nagad, Rocket, Visa, Mastercard): label, logo upload,
brand colour, enabled, display order, checkout availability.
> Today bKash/Nagad/Rocket render text wordmarks because no licensed asset
> exists. Admin uploads the official merchant-kit SVGs and they replace the
> fallback automatically.

### 2.7 SEO
Default meta title pattern, default description, OG image, Twitter handle,
Google/Facebook verification tags, robots directives, sitemap toggles per
section, JSON-LD org fields (rating average/count currently in `reviews.ts`).

### 2.8 Theme — **P7**
Brand colour ramp (50–900 from one primary), ink scale, radii, shadows, fonts.
> Worth building given the recent light/dark experiments: the tokens are already
> centralised in `globals.css`, so exposing primary colour + radius + font is a
> small addition with high perceived value. **Ships as "Advanced" with a reset
> button** — a client setting a low-contrast primary can break accessibility, so
> the form runs a live WCAG contrast check and warns before saving.

### 2.9 Staff & roles — **P1**
Invite admin, assign role (owner/manager/staff), suspend, force logout,
per-role permission matrix, impersonate customer (owner only, audit-logged).

---

## 3. Catalogue

### 3.1 Products — **P4**
Per product: title, slug (+ auto-301 on change), brand, category, subcategory,
description, highlights, specs, price, compare-at, badge, tags, free delivery,
active/published, publish date, SEO title/description, images (multi, ordered,
alt, optional colour pinning), variants matrix.

Bulk: publish/unpublish, price adjust (% or fixed), stock adjust, category move,
tag add/remove, CSV import/export, duplicate.

List view: search, filter by category/brand/stock/status/price, sort, saved
views, pagination.

### 3.2 Variants — **P4**
Generated from colour × size. Per row: SKU, colour name + hex, size value +
label, size system (apparel/footwear/one-size), price override, stock, active.
> The frontend rule **"an option with one value is metadata, not a choice"**
> must be preserved — the admin previews whether a product will show pickers or
> go straight to Add to Cart.

Size templates (S–XXL, EU 36–46) are admin-editable presets.

### 3.3 Categories & subcategories — **P4**
Name, short name (scroller label), slug, blurb, image, tint, order (drag),
active, SEO. Subcategories nested with their own ordering.
> Deleting a category with products is blocked; reassign first.

### 3.4 Brands — **P4**
Name, slug, logo. Currently just a string on the product.

### 3.5 Inventory — **P5**
Stock by variant, movements ledger with reason, low-stock report, bulk restock,
manual adjustment with mandatory note.

### 3.6 Flash sales — **P4**
Campaign: name, start, end, active. Items: product, sale price, stock cap,
claimed count (drives the "% claimed" bar). Countdown timer reads campaign end.

---

## 4. Orders — **P5/P6**

List: filter by status, date range, district, payment method, coupon; search by
order number, phone, name; export CSV.

Detail: items with variant labels, customer + address, totals breakdown,
timeline (`OrderEvent`), internal notes, status transitions with guards,
cancel (restores stock), mark paid/refunded, print invoice + packing slip,
courier CSV, resend confirmation, edit address before shipping.

Settings: which statuses notify the customer, status labels shown on tracking,
auto-cancel window for unconfirmed COD orders.

---

## 5. Content

### 5.1 Banners — **P7**
Hero carousel, promo tiles, wide banner. Per banner: eyebrow, title, subtitle,
CTA label + link, tone (light/dark), desktop image, mobile image, order,
active, schedule window.
> **Tone must stay an explicit choice, not a theme value.** It is picked from
> how pale the *photograph* is — the admin shows a live preview so light copy
> can never land on a light image.

Carousel behaviour: autoplay on/off, interval, loop.

### 5.2 Announcements — **P7**
Message text, order, active, schedule. Rotation interval and dismissible flag.

### 5.3 Pages — **P7**
about · privacy · terms · shipping · refund-policy · contact.
Block editor (heading, paragraph, list, callout, table, image), SEO fields,
publish toggle. Currently hardcoded JSX arrays.

Also on About: promises list, stats grid. On Contact: help links.

### 5.4 FAQ — **P7**
Question, answer, group, order, active, optional CTA label + link.
> Also feeds the `FAQPage` JSON-LD, so edits change search appearance.

### 5.5 Reviews — **P7**
Moderation queue: approve/reject, edit, mark verified, attach to product,
feature on homepage. Recomputes `ratingAvg` / `reviewCount`.

### 5.6 Screenshot wall — **P7**
Upload screenshots, caption, assign column, order, active.
> **Blocked on a `consentObtained` checkbox** — the current caption claims
> permission that has not been obtained. Publishing is disabled until ticked.

Animation: speed per column, direction, pause-on-hover.

### 5.7 Navigation & discovery — **P7**
Footer help column, footer company column, mobile menu shortcuts, mobile menu
help links, trending search terms, trust strip items (icon, title, subtitle).
> Trending searches currently have a build-time guard that fails the build if a
> term returns no results. That becomes an **admin-side warning** on save.

---

## 6. Media — **P2**

ImageKit-backed library: upload (drag/drop, multi), folders, search, alt text,
replace in place, delete (with usage check), dimensions/size/format,
"still using demo photography" report.
> All 62 demo product photos and 9 banner images are placeholders and must be
> replaced before launch — the report tracks that explicitly.

---

## 7. Customers — **P6**

List, search by phone/email/name, order history, addresses, lifetime value,
ban/unban with reason, force logout, wishlist contents, newsletter status.

---

## 8. Marketing — **P8**

Coupons (code, type, value, min spend, max discount, usage caps, per-user cap,
window, active) · newsletter subscribers + export · abandoned carts.

---

## 9. System — **P9**

Audit log (who/what/before/after, filterable) · cache tools (purge by tag) ·
import/export · health (DB, ImageKit, queue) · error log.

---

## 10. Explicitly NOT configurable

Stated so "everything" has an honest boundary. These are code, not settings:

| Not configurable | Why |
|---|---|
| Page layouts / component structure | A layout builder is a different product; changing structure is a deploy |
| Which routes exist | Routing is code; CMS pages cover new content pages |
| Checkout flow order | Legal/UX critical; changes need testing |
| Variant selection rules | Enforce order pickability — a setting here causes unpickable orders |
| Cache tag strategy | Correctness-critical |
| Accessibility minimums (44px targets, contrast floors) | Non-negotiable |
| Sort algorithm internals | Sort *options* are configurable; the maths is not |

---

## 11. Admin build conventions

- **Server Actions for every mutation.** Each re-checks session + role and
  re-validates with Zod. Never trust a hidden field.
- **One form pattern**: `react-hook-form` + Zod resolver, shared field
  components, inline errors, dirty-state guard on navigate away.
- **One table pattern**: TanStack Table + `nuqs` for URL-persisted filters, so
  a filtered view is shareable and survives refresh.
- **Optimistic UI only where safe.** Stock and prices always confirm from the
  server.
- **Every write emits an audit log entry and invalidates its cache tag.**
- **`/admin` is `noindex, nofollow`**, excluded from sitemap, behind auth at the
  layout level.
- **Desktop-first** (the storefront's mobile-first budget does not apply), but
  order status updates must work on a phone — staff will use them on the move.

---

## 12. Effort summary

| Area | Phase | Days |
|---|---|---|
| Admin shell, auth guard, table/form patterns | P4 | 2 |
| Products + variants + images | P4 | 3 |
| Categories, brands, flash sales | P4 | 1 |
| Orders list + detail + fulfilment | P6 | 4 |
| Customers | P6 | 1 |
| Content: banners, announcements, nav, trust | P7 | 2 |
| Content: pages, FAQ, reviews, screenshots | P7 | 2 |
| Settings: identity, contact, commerce, delivery, payments, SEO | P7 | 2 |
| Theme editor | P7 | 1 |
| Media library | P2 | 1.5 |
| Marketing | P8 | 2 |
| System / audit | P9 | 1 |
| **Admin total** | | **~22.5 days** |

Included in the ~43-day total in the main plan.
