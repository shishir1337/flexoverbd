# FlexOver BD — Storefront

Mobile-first e-commerce frontend for [flexoverbd.com](https://www.flexoverbd.com).
Next.js 16 (App Router, Turbopack, React Compiler) · React 19 · Tailwind CSS v4 · TypeScript · Biome.

**Status:** all pages built, frontend only. All data is local demo data —
no backend, no database yet.

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build            # production build
pnpm lint             # Biome check
pnpm typecheck        # tsc --noEmit
pnpm images:products  # download the demo product photography
pnpm images:manifest  # regenerate IMAGE-PROMPTS.md
```

---

## Images

There are two kinds, and they are at different stages.
**[IMAGE-PROMPTS.md](./IMAGE-PROMPTS.md)** is the full brief.

### Product & category photos — 70 in place ✅

Real e-commerce packshots ship with the repo, downloaded by
`pnpm images:products` from [DummyJSON](https://dummyjson.com), a public
dataset built for prototyping. Every product in the catalogue has one, so the
grid can be judged with real photography rather than grey boxes.

> ⚠️ **These are stand-ins and must be replaced before launch.** They are not
> FlexOver products, and the licensing only covers prototyping. Each one is
> tagged `demoSource` in `src/data/products.ts` so they are easy to find.

Because the stand-in photos are of genuinely branded goods, the demo catalogue
names them accurately — the AirPods card says *Apple*, the perfume says
*Chanel*. That is deliberate: an Apple logo sitting under an invented brand
name is a contradiction a client will spot immediately. All of it is replaced
by the real catalogue anyway.

### Banners — 9 still needed ⬜

The hero and promo artwork has **no image yet**; this is the actionable list.
Generate each from the prompt in IMAGE-PROMPTS.md at the stated size and drop
it into `public/`.

**Two constraints matter here.** Headlines and prices are never baked into the
artwork — they are live HTML rendered over it, which keeps copy sharp at every
pixel density, editable without regenerating an image, translatable, and
readable by search engines. That is why each banner prompt asks for clean empty
space on one side, and why every prompt ends with *no text, no logos, no
watermark*. Artwork with text burned in will collide with the real headline.

### Payment marks — 2 of 6 real

The footer strip renders a real logo from `public/images/payments/<slug>.svg`
when one exists, and a brand-coloured wordmark until then.

| Method | Status |
| --- | --- |
| Visa, Mastercard | ✅ real marks, from [Simple Icons](https://simpleicons.org) (CC0) |
| bKash, Nagad, Rocket | ⬜ wordmark placeholder |
| Cash on Delivery | ✅ icon + label (not a brand) |

The three Bangladeshi wallets have no openly-licensed asset, and hand-drawing
a trademark from memory would be both legally sloppy and worse-looking than
the placeholder — so they need the official SVG from each provider's merchant
brand kit, saved as `bkash.svg`, `nagad.svg` and `rocket.svg`. They then
replace the wordmarks with no code change.

Their placeholder colours (`paymentMethods` in `src/lib/site.ts`) are the
brands' well-known colours but were not taken from an official brand guide —
worth correcting alongside the logos.

### How adding an image works

1. Save the file at the path listed in IMAGE-PROMPTS.md, under `public/`.
2. Refresh. **That's it** — no code change.

`resolvePublicImage()` checks the disk at build time. If a file is there,
`<Media>` renders an optimised `next/image`; if not, it renders a branded
placeholder — so images can land a few at a time with zero broken-image
requests in between.

The extension is a hint, not a contract: the data says `.jpg`, the demo files
on disk are `.webp`, and a `.png` you drop in later resolves just as well. Only
the file name before the dot has to match.

Run `pnpm images:manifest` any time for current progress.

---

## Where things live

```
src/
  app/
    layout.tsx          Root shell: fonts, metadata, providers, header/footer
    page.tsx            Homepage — section order and the reasoning behind it
    loading.tsx         Skeleton mirroring the homepage box model
    json-ld.tsx         Organization + WebSite structured data
    globals.css         Design tokens (@theme), base layer, custom utilities
    manifest.ts / robots.ts / sitemap.ts
  components/
    home/               Homepage sections (hero, flash sale, rails, reviews…)
    layout/             Header, footer, bottom nav, WhatsApp FAB, logo
    product/            Product card, add-to-cart, wishlist
    cart/               Cart context, drawer, toast, header button
    ui/                 Button, Media, primitives (Badge/Rating/Price/Rail…)
  data/                 Demo catalogue — categories, products, banners, reviews
  lib/
    site.ts             Brand facts: phone, socials, delivery fees, thresholds
    utils.ts            cn(), formatBDT(), discountPercent()
    public-files.ts     Resolves an artwork path to the file on disk
scripts/
  image-manifest.mts    Generates IMAGE-PROMPTS.md
  fetch-demo-images.mts Downloads the demo product photography
public/images/          70 demo photos — replace before launch
```

### Things you'll most likely want to edit

| To change… | Edit |
| --- | --- |
| Phone, WhatsApp, email, socials | `src/lib/site.ts` |
| Delivery fees, free-shipping threshold, return window | `src/lib/site.ts` (`commerce`) |
| Products, prices, badges, stock | `src/data/products.ts` |
| Categories | `src/data/categories.ts` |
| Hero / promo banner copy | `src/data/banners.ts` |
| Announcement ticker | `src/data/index.ts` (`announcements`) |
| Colours, spacing, shadows, motion | `src/app/globals.css` (`@theme`) |

---

## Design system

**Brand primary is `#ff8e02`** (`--color-brand-500`).

One deliberate decision worth knowing about: white text on `#ff8e02` sits at
about **2.3:1** contrast, which fails WCAG. No orange that still reads as
orange can pass 4.5:1 with white text — every major commerce site has the same
problem. So:

- **Buttons and other text-bearing fills use `brand-600` (`#e67700`)**, visually
  the same orange, at ~3.1:1 — clearing the WCAG 1.4.11 bar for UI components.
- **`brand-500` (`#ff8e02`) is used everywhere text isn't**: badges, active nav
  indicators, icon fills, progress bars, focus glow. The brand hex is still the
  colour you see across the page.
- **`brand-700` (`#b35a00`)** is the orange for *text on white* — 4.67:1, AA.

If the client wants the exact `#ff8e02` on buttons and accepts the trade-off,
it is a one-line change in `src/components/ui/button.tsx` (`brand-600` → `brand-500`).

Other tokens: an ink scale (`--color-ink` … `--color-ink-4`, all AA+ on white),
surfaces, semantic colours, a 4/8px spacing rhythm, one shared easing pair, and
a named z-index scale so layering never becomes guesswork.

**Type:** Inter for UI and all pricing (tabular figures, so prices and the
countdown never reflow), Plus Jakarta Sans for headings. Both self-hosted and
subset by `next/font`. The font stack names Bengali-capable system faces after
Inter so the ৳ sign — which Inter's latin subset doesn't contain — renders
correctly on every device at zero download cost.

---

## Performance approach

The target visitor is on a phone in Bangladesh, often arriving from the
Facebook in-app browser on 4G. Everything below follows from that.

- **The homepage is fully prerendered static HTML.** No dynamic APIs, no
  server work per request.
- **No component library.** HeroUI and friends target Tailwind v3 and cost far
  more JS than a small in-house component layer. The only runtime dependencies
  are `lucide-react` (tree-shaken SVG icons), `embla-carousel` (hero only), and
  `clsx`/`tailwind-merge`.
- **Client JavaScript is limited to five small islands**: the hero carousel,
  cart (context/drawer/toast/button), the flash-sale countdown, the search
  suggestions panel, and the newsletter form. Every product card, every
  section, and the entire footer is a Server Component.
- **Horizontal rails are pure CSS scroll-snap**, not a JS carousel. Native
  momentum scrolling feels better on touch and ships zero bytes.
- **AVIF/WebP with phone-first `deviceSizes`**, and every `<Media>` call passes
  a `sizes` hint — a 2-up card on a phone is only ~46vw, so this roughly halves
  image weight versus the default.
- **No layout shift**: every image sits in a fixed aspect-ratio box, product
  titles are clamped to a reserved two lines, and the skeletons in
  `loading.tsx` mirror the real box model exactly.
- **`prefers-reduced-motion` is honoured globally**, and the hero skips
  autoplay entirely for those users.

### Measured payload (production build)

| | gzip |
| --- | --- |
| React 19.2 + Next 16 App Router runtime | 182 KB |
| All of our application code, including icons | 35 KB |
| Hero carousel (Embla, split into its own chunk) | 11 KB |
| **Total first-load JS** | **228 KB** |
| CSS (entire design system, one file) | 12 KB |
| Prerendered HTML incl. RSC payload | 80 KB |

The framework runtime is the floor for App Router and is not something we
control; what we added on top is ~46 KB for a homepage carrying a cart, a
carousel, live search suggestions, a countdown and ~60 product cards.

Worth knowing: the HTML is 80 KB gzip largely because React Server Components
inline the render payload, and the page carries ~60 products. If the client
wants the first paint even lighter, the lever is product counts in
`src/app/page.tsx` (`getBestSellers(8)`, `getNewArrivals(10)`, …) — not the
architecture. The page is readable before any JavaScript runs either way.

## Accessibility notes

- All touch targets are ≥44px; smaller visual controls (the wishlist heart, the
  card's quick-add) extend their hit area with a pseudo-element rather than
  growing the layout.
- Skip link, one `h1` per page, sequential headings, visible focus rings,
  `inert` on the closed cart drawer, `aria-live` on the cart toast, labelled
  form fields with errors below the field and validation on submit rather than
  per keystroke.
- Pinch-zoom is never disabled.
- Colour is never the only signal — stock warnings, discounts and the active
  nav item all carry text or shape as well.

---

## Pages

Every route below is built and reachable. A crawl of the site finds **123 pages
and zero broken links**.

| Route | What it is |
| --- | --- |
| `/` | Homepage |
| `/product/[slug]` | Product detail — 62 pages, prerendered |
| `/category/[slug]` | Category listing — 8 |
| `/category/[slug]/[sub]` | Subcategory listing — 30 |
| `/categories` | Full department directory |
| `/search?q=` | Search results |
| `/offers` `/best-sellers` `/new-arrivals` `/top-rated` | Curated listings |
| `/cart` → `/checkout` → `/checkout/success` | Purchase flow |
| `/track-order` | Guest order tracking by order number or phone |
| `/wishlist` `/account` | Saved items and order history |
| `/about` `/contact` `/faq` `/shipping` `/refund-policy` `/privacy` `/terms` | Info and policy |

### Listings

Filters and sort live entirely in the URL, so listing pages stay Server
Components with no client filter store, and a filtered view is shareable and
back-button-correct. Every filter control is a plain link; only the sort
`<select>` needs JavaScript.

### Checkout

Guest by default — name, mobile, district, address. COD only. Delivery is
priced from the district actually chosen rather than a separate toggle, so the
quote can never contradict the address. The optional "save my details" box is
the only mention of an account.

### What is device-local

There is no backend, so the cart, wishlist and placed orders live in
`localStorage`. That is enough to demonstrate the whole journey — checkout
writes an order, the confirmation reads it back, and tracking and the account
page query the same store. `src/lib/orders.ts` is written so each function maps
to one future API call.

**Order tracking only finds orders placed on the same device.** That is stated
on the page, with a WhatsApp fallback.

## Not built yet


**Authentication.** `/account` works device-locally and says so plainly rather
than faking a signed-in session. There are no `/login` or `/register` pages —
building forms that cannot authenticate anything would be theatre. They arrive
with the backend.

**Online payment.** COD only, as agreed. The `paymentMethod` field on `Order`
already leaves room for bKash, Nagad and cards.

One content note: the customer reviews deliberately render **initials, not
avatar photos**. A stock portrait of a real person attached to a quote they
never gave is a misrepresentation the moment the site goes live, and demo
content has a habit of surviving to production. When there are real reviews
with real consent, adding photos back is a small change to `ReviewsSection`.
#   f l e x o v e r b d  
 