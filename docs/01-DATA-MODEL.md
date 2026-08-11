# FlexOver BD — Data Model

**Status:** Draft for review · Companion to [`00-BACKEND-PLAN.md`](./00-BACKEND-PLAN.md)

This is the schema everything else is built against. It is cheapest to change
now — please review §9 (open modelling questions) before we migrate.

Prisma 7 syntax. `String @id @default(cuid())` throughout; money is stored as
**integers in poisha-free BDT** (i.e. `1090` = ৳1,090) because BDT has no
practical subunit in retail and integers avoid float drift entirely.

---

## 1. Design rules

1. **Order lines are snapshots.** Editing a product must never rewrite an old
   order. Title, price, image and variant label are copied at purchase time.
2. **Stock lives on the variant, never the product.** Even a product with no
   choices gets exactly one variant row — so there is a single code path for
   stock, SKU and pricing.
3. **Nothing user-visible is hardcoded.** If it renders, it has a table.
4. **Soft-delete catalogue entities** (`archivedAt`) — hard deletes break order
   history and inbound links.
5. **Slugs are permanent.** Renaming records the old one in `SlugHistory` and
   serves a 301.
6. **Every table an admin can change carries `createdAt`, `updatedAt`**, and
   mutations are recorded in `AdminAuditLog`.

---

## 2. Catalogue

```prisma
model Brand {
  id        String    @id @default(cuid())
  slug      String    @unique
  name      String
  logoId    String?
  logo      MediaAsset? @relation(fields: [logoId], references: [id])
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Category {
  id            String        @id @default(cuid())
  slug          String        @unique
  name          String
  shortName     String        // compact label for the circular scroller
  blurb         String
  tint          String        // Tailwind class pair for placeholder/chip
  imageId       String?
  image         MediaAsset?   @relation(fields: [imageId], references: [id])
  position      Int           @default(0)
  isActive      Boolean       @default(true)
  seoTitle      String?
  seoDescription String?
  subcategories Subcategory[]
  products      Product[]
  archivedAt    DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([isActive, position])
}

model Subcategory {
  id         String    @id @default(cuid())
  categoryId String
  category   Category  @relation(fields: [categoryId], references: [id])
  slug       String
  name       String
  position   Int       @default(0)
  isActive   Boolean   @default(true)
  products   Product[]
  archivedAt DateTime?

  @@unique([categoryId, slug])
  @@index([categoryId, isActive, position])
}

model Product {
  id             String   @id @default(cuid())
  slug           String   @unique
  title          String
  brandId        String?
  brand          Brand?   @relation(fields: [brandId], references: [id])
  categoryId     String
  category       Category @relation(fields: [categoryId], references: [id])
  subcategoryId  String?
  subcategory    Subcategory? @relation(fields: [subcategoryId], references: [id])

  description    String?  @db.Text   // null → category template fallback (as today)
  highlights     Json?               // string[] override for derived bullets
  specs          Json?               // [{label, value}] override

  // Money — integer BDT
  price          Int
  compareAt      Int?

  badge          ProductBadge?
  freeDelivery   Boolean  @default(false)
  tags           String[]

  // Denormalised aggregates, recomputed on review/order writes.
  ratingAvg      Decimal  @default(0) @db.Decimal(2,1)
  reviewCount    Int      @default(0)
  soldCount      Int      @default(0)

  isActive       Boolean  @default(true)
  publishedAt    DateTime?
  archivedAt     DateTime?

  seoTitle       String?
  seoDescription String?

  variants       ProductVariant[]
  images         ProductImage[]
  reviews        Review[]
  flashItems     FlashSaleItem[]
  orderItems     OrderItem[]
  wishlistItems  WishlistItem[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([categoryId, isActive])
  @@index([subcategoryId, isActive])
  @@index([isActive, publishedAt])
  @@index([isActive, price])          // price sort/filter
  @@index([isActive, ratingAvg])      // rating filter
}

enum ProductBadge { NEW BESTSELLER LIMITED RESTOCK }
```

### 2.1 Variants — the important one

Today colours and sizes are arrays on the product. That cannot carry stock or a
SKU per combination. One row per sellable combination instead:

```prisma
model ProductVariant {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  sku        String   @unique          // FB-P001-NAVY-M

  colourName String?                   // "Navy"       — null when no colour choice
  colourHex  String?                   // "#1f2d4d"
  sizeValue  String?                   // "M" | "41"   — null when no size choice
  sizeLabel  String?                   // "Medium" | "EU 41"
  sizeSystem SizeSystem?

  priceOverride Int?                   // null → inherit Product.price
  stock         Int      @default(0)
  isActive      Boolean  @default(true)

  position   Int      @default(0)
  orderItems OrderItem[]
  movements  StockMovement[]

  @@unique([productId, colourName, sizeValue])
  @@index([productId, isActive])
}

enum SizeSystem { APPAREL FOOTWEAR ONESIZE }
```

**Mapping from today:** `variantLineId()` produces
`p-001::colour:Navy::size:M`. That becomes a lookup on
`(productId, colourName, sizeValue)` → one `ProductVariant`, and the cart stores
`variantId`. The "an option with one value is metadata, not a choice" rule from
the frontend is preserved: a product whose variants all share one `colourName`
renders no picker, but the variant still carries the colour for the packing slip.

```prisma
model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  mediaId   String
  media     MediaAsset @relation(fields: [mediaId], references: [id])
  alt       String
  position  Int     @default(0)
  // Optional: pin an image to a colourway so the gallery follows selection.
  colourName String?

  @@index([productId, position])
}
```

### 2.2 Flash sales

Today `product.flash` is an inline object. Campaign-based instead, so a sale has
a start/end and can be scheduled:

```prisma
model FlashSaleCampaign {
  id        String   @id @default(cuid())
  name      String
  startsAt  DateTime
  endsAt    DateTime
  isActive  Boolean  @default(true)
  items     FlashSaleItem[]

  @@index([isActive, startsAt, endsAt])
}

model FlashSaleItem {
  id         String  @id @default(cuid())
  campaignId String
  campaign   FlashSaleCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  salePrice  Int
  stockCap   Int?                 // units available at the sale price
  claimed    Int     @default(0)  // drives the "% claimed" bar

  @@unique([campaignId, productId])
}
```

---

## 3. Customers, auth, addresses

Better Auth owns `User`, `Session`, `Account`, `Verification` (generated by
`npx auth generate`). We extend `User`:

```prisma
model User {
  // --- Better Auth core (generated) ---
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]

  // --- admin plugin ---
  role          String?   @default("customer")  // owner|manager|staff|customer
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?

  // --- FlexOver extensions ---
  phone         String?   @unique   // primary identifier in BD
  phoneVerified Boolean   @default(false)
  addresses     Address[]
  orders        Order[]
  wishlist      WishlistItem[]
  carts         Cart[]
  auditLogs     AdminAuditLog[]
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label      String? // "Home", "Office"
  fullName   String
  phone      String
  districtId String
  district   District @relation(fields: [districtId], references: [id])
  area       String   // thana / area
  line1      String   // house, road, block
  landmark   String?
  isDefault  Boolean  @default(false)

  @@index([userId])
}
```

> **Guest checkout stays the default** (already agreed). Guest orders have
> `userId = null` and carry contact/address fields inline on the order.

---

## 4. Cart

Server-side so it survives device changes and can be recovered as an abandoned
cart. Guests get an httpOnly cookie token.

```prisma
model Cart {
  id         String     @id @default(cuid())
  userId     String?
  user       User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  guestToken String?    @unique          // cookie value for anonymous carts
  items      CartItem[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@index([userId])
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  qty       Int     @default(1)

  @@unique([cartId, variantId])   // matches the "one line per variant" rule
}
```

On login, the guest cart merges into the user cart (sum quantities, cap at stock).

---

## 5. Orders

```prisma
model Order {
  id            String   @id @default(cuid())
  number        String   @unique         // FB-YYMMDD-XXXX (keep existing format)

  userId        String?                  // null for guest orders
  user          User?    @relation(fields: [userId], references: [id])

  // Contact snapshot — guests have no user row to join to.
  customerName  String
  customerPhone String
  customerEmail String?

  // Address snapshot
  districtId    String
  district      District @relation(fields: [districtId], references: [id])
  area          String
  line1         String
  landmark      String?
  notes         String?

  status        OrderStatus   @default(PLACED)
  paymentMethod PaymentMethod @default(COD)
  paymentStatus PaymentStatus @default(PENDING)

  // Money — all integer BDT, all computed server-side
  subtotal      Int
  deliveryFee   Int
  discount      Int      @default(0)
  total         Int

  couponId      String?
  coupon        Coupon?  @relation(fields: [couponId], references: [id])

  items         OrderItem[]
  events        OrderEvent[]

  placedAt      DateTime @default(now())
  confirmedAt   DateTime?
  shippedAt     DateTime?
  deliveredAt   DateTime?
  cancelledAt   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status, placedAt])
  @@index([customerPhone])        // tracking by phone
  @@index([userId, placedAt])
}

enum OrderStatus {
  PLACED        // submitted, awaiting phone confirmation (COD reality)
  CONFIRMED     // customer confirmed on the phone
  PACKED
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentMethod { COD BKASH NAGAD ROCKET CARD }
enum PaymentStatus { PENDING PAID FAILED REFUNDED }

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Live references, for reporting and re-order.
  productId    String?
  product      Product? @relation(fields: [productId], references: [id])
  variantId    String?
  variant      ProductVariant? @relation(fields: [variantId], references: [id])

  // Snapshots — the order must render correctly even if the product is edited
  // or deleted afterwards.
  titleSnapshot   String
  variantLabel    String?   // "Navy · EU 42"
  skuSnapshot     String?
  priceSnapshot   Int
  imageUrlSnapshot String?
  qty             Int
  lineTotal       Int

  @@index([orderId])
}

model OrderEvent {
  id          String      @id @default(cuid())
  orderId     String
  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status      OrderStatus
  note        String?
  isCustomerVisible Boolean @default(true)
  createdById String?
  createdAt   DateTime    @default(now())

  @@index([orderId, createdAt])
}
```

**This replaces `derivedStatus()`** — the fake time-based progression. The
tracking page reads `OrderEvent` rows.

### 5.1 Stock ledger

```prisma
model StockMovement {
  id        String   @id @default(cuid())
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  delta     Int                       // negative = sold, positive = restock
  reason    StockReason
  orderId   String?
  note      String?
  createdById String?
  createdAt DateTime @default(now())

  @@index([variantId, createdAt])
}

enum StockReason { ORDER CANCEL RETURN MANUAL_ADJUST RESTOCK CORRECTION }
```

`ProductVariant.stock` is the running total; the ledger explains it. Checkout
writes both inside one transaction.

---

## 6. Geography & delivery

```prisma
model Division {
  id        String     @id @default(cuid())
  name      String     @unique
  districts District[]
}

model District {
  id         String   @id @default(cuid())
  divisionId String
  division   Division @relation(fields: [divisionId], references: [id])
  name       String   @unique
  zoneId     String
  zone       DeliveryZone @relation(fields: [zoneId], references: [id])
  feeOverride Int?     // per-district exception; null → zone fee
  isActive   Boolean  @default(true)
  addresses  Address[]
  orders     Order[]
}

model DeliveryZone {
  id        String  @id @default(cuid())
  name      String  @unique      // "Inside Dhaka", "Outside Dhaka"
  fee       Int
  etaLabel  String              // "1–2 days"
  position  Int     @default(0)
  districts District[]
}
```

Seeded from the existing `src/data/districts.ts` (64 districts, 8 divisions).
Admin can add zones, change fees, and override any single district.

---

## 7. Content & configuration

```prisma
/// Key/value store for singleton settings. One row per logical group so an
/// edit to "contact" cannot clobber "commerce".
model Setting {
  key       String   @id      // "site" | "contact" | "social" | "commerce" | "seo" | "theme"
  value     Json
  updatedAt DateTime @updatedAt
}

model MediaAsset {
  id           String   @id @default(cuid())
  imagekitId   String   @unique
  filePath     String              // "/products/kurti-navy.jpg"
  url          String
  thumbnailUrl String?
  alt          String   @default("")
  width        Int?
  height       Int?
  mimeType     String?
  sizeBytes    Int?
  folder       String?
  uploadedById String?
  createdAt    DateTime @default(now())

  categories   Category[]
  brands       Brand[]
  productImages ProductImage[]
  banners      Banner[]      @relation("BannerDesktop")
  bannersMobile Banner[]     @relation("BannerMobile")
  screenshots  ReviewScreenshot[]

  @@index([folder])
}

model Banner {
  id          String     @id @default(cuid())
  placement   BannerPlacement          // HERO | PROMO_TILE | WIDE
  eyebrow     String?
  title       String
  subtitle    String?
  cta         String?
  href        String?
  tone        BannerTone @default(LIGHT)
  imageDesktopId String?
  imageDesktop MediaAsset? @relation("BannerDesktop", fields: [imageDesktopId], references: [id])
  imageMobileId  String?
  imageMobile  MediaAsset? @relation("BannerMobile", fields: [imageMobileId], references: [id])
  position    Int        @default(0)
  isActive    Boolean    @default(true)
  startsAt    DateTime?
  endsAt      DateTime?

  @@index([placement, isActive, position])
}

enum BannerPlacement { HERO PROMO_TILE WIDE }
enum BannerTone { LIGHT DARK }

model Announcement {
  id       String    @id @default(cuid())
  text     String
  position Int       @default(0)
  isActive Boolean   @default(true)
  startsAt DateTime?
  endsAt   DateTime?
}

model TrendingSearch {
  id       String  @id @default(cuid())
  term     String  @unique
  position Int     @default(0)
  isActive Boolean @default(true)
}

model TrustItem {
  id       String  @id @default(cuid())
  icon     String            // lucide icon name
  title    String
  subtitle String?
  position Int     @default(0)
  isActive Boolean @default(true)
}

model NavLink {
  id        String   @id @default(cuid())
  group     NavGroup           // FOOTER_HELP | FOOTER_COMPANY | MOBILE_SHORTCUT | MOBILE_HELP
  label     String
  href      String
  icon      String?
  position  Int      @default(0)
  isActive  Boolean  @default(true)

  @@index([group, isActive, position])
}

enum NavGroup { FOOTER_HELP FOOTER_COMPANY MOBILE_SHORTCUT MOBILE_HELP }

/// CMS pages: about, privacy, terms, shipping, refund-policy, contact.
model Page {
  id             String   @id @default(cuid())
  slug           String   @unique
  title          String
  seoTitle       String?
  seoDescription String?
  blocks         Json                 // [{type:'heading'|'paragraph'|'list'|'callout', ...}]
  isPublished    Boolean  @default(true)
  updatedAt      DateTime @updatedAt
}

model FaqItem {
  id       String  @id @default(cuid())
  question String
  answer   String  @db.Text
  group    String?            // "Delivery", "Payment", "Returns"
  position Int     @default(0)
  isActive Boolean @default(true)
  ctaLabel String?            // the "Track your order →" links
  ctaHref  String?
}

model Review {
  id            String   @id @default(cuid())
  productId     String?
  product       Product? @relation(fields: [productId], references: [id])
  orderId       String?            // set → verified purchase
  authorName    String
  location      String?
  rating        Int
  body          String   @db.Text
  isApproved    Boolean  @default(false)
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([productId, isApproved])
}

/// The auto-scrolling screenshot wall on the homepage.
model ReviewScreenshot {
  id         String  @id @default(cuid())
  mediaId    String
  media      MediaAsset @relation(fields: [mediaId], references: [id])
  caption    String?
  column     Int     @default(0)
  position   Int     @default(0)
  isActive   Boolean @default(true)
  consentObtained Boolean @default(false)   // ← see note below
}
```

> ⚠️ `consentObtained` exists because the current caption claims permission that
> has not been obtained. The admin UI must block publishing a screenshot until
> this is ticked.

```prisma
model SlugHistory {
  id        String   @id @default(cuid())
  entity    String            // "product" | "category" | "page"
  oldSlug   String
  newSlug   String
  createdAt DateTime @default(now())

  @@unique([entity, oldSlug])
}
```

Proxy/middleware reads this to 301 old URLs — protects SEO when names change.

---

## 8. Marketing & operations

```prisma
model Coupon {
  id            String     @id @default(cuid())
  code          String     @unique
  type          CouponType
  value         Int                    // percent (1-100) or fixed BDT
  minSubtotal   Int?
  maxDiscount   Int?
  usageLimit    Int?
  perUserLimit  Int?       @default(1)
  usedCount     Int        @default(0)
  startsAt      DateTime?
  endsAt        DateTime?
  isActive      Boolean    @default(true)
  orders        Order[]
  redemptions   CouponRedemption[]
}

enum CouponType { PERCENT FIXED FREE_DELIVERY }

model CouponRedemption {
  id       String   @id @default(cuid())
  couponId String
  coupon   Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  userId   String?
  phone    String?
  orderId  String
  amount   Int
  createdAt DateTime @default(now())

  @@index([couponId, userId])
  @@index([couponId, phone])
}

model NewsletterSubscriber {
  id           String   @id @default(cuid())
  email        String   @unique
  isSubscribed Boolean  @default(true)
  source       String?
  createdAt    DateTime @default(now())
}

model WishlistItem {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

model AdminAuditLog {
  id         String   @id @default(cuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String            // "product.update"
  entity     String
  entityId   String?
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId, createdAt])
}
```

---

## 9. Open modelling questions

Please decide these before we migrate — each is expensive to retrofit.

1. **Bangla / bilingual content.** If yes, ~15 entities need either duplicate
   columns (`title`, `titleBn`) or a `Translation` table. **Biggest single
   schema decision.**
2. **Per-variant images.** `ProductImage.colourName` is modelled optimistically
   so the gallery can follow the selected colour. Confirm it is wanted.
3. **Per-variant pricing.** `priceOverride` exists (e.g. XXL costs more).
   Confirm, or drop it and keep one price per product.
4. **Stock reservation window.** Do we hold stock while someone is in checkout,
   or only decrement on order placement? Holding needs a `StockReservation`
   table plus expiry sweeping. **Recommendation:** decrement at placement only —
   simpler, and COD cancellation already restores stock.
5. **Guest order lookup security.** Today tracking needs order number *or*
   phone. Phone alone is guessable. **Recommendation:** require order number +
   last 4 digits of phone, or send an OTP.
6. **Review source.** Do customers write reviews in-app (needs moderation
   queue + verified-purchase gating), or does admin enter them?
7. **Multi-warehouse / pickup points?** Assumed no. Adding later means a
   `Location` dimension on stock.
8. **Product-level vs variant-level `freeDelivery`.** Currently product-level;
   assumed to stay.

---

## 10. Seed & migration plan

`prisma/seed.ts` is idempotent and re-runnable:

1. Divisions + 64 districts + 2 delivery zones ← `src/data/districts.ts`
2. Settings groups (site, contact, social, commerce, seo) ← `src/lib/site.ts`
3. Categories + subcategories ← `src/data/categories.ts`
4. Brands, derived from distinct `product.brand` values
5. 62 products → `Product` + one `ProductVariant` per colour×size combination
6. Banners, promo tiles, wide banner ← `src/data/banners.ts`
7. Announcements, trending searches, trust items, nav links
8. Pages (about/privacy/terms/shipping/refund) converted to blocks
9. FAQ items ← `src/app/faq/page.tsx`
10. Reviews ← `src/data/reviews.ts`, `isApproved: true`
11. Owner admin user

**Images:** demo photos currently come from DummyJSON and every one must be
replaced with the client's own photography before launch. The seed uploads
whatever exists in `public/images/` to ImageKit and records `MediaAsset` rows,
flagging `demoSource` assets so the admin can list "images still needing
replacement".

**Verification after migration:** re-run the crawler
(122 URLs, 0 broken links) and diff rendered HTML against the current build.
The storefront should be byte-identical apart from image URLs.
