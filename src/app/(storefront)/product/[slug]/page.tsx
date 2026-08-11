import { Check, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductRail } from "@/components/home/product-sections";
import { MetaViewContent } from "@/components/meta-events";
import { BuyBox } from "@/components/product/buy-box";
import { DeliveryPanel } from "@/components/product/delivery-panel";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductReviews } from "@/components/product/product-reviews";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { categoryIcon, Media } from "@/components/ui/media";
import { Badge, Price, Rating } from "@/components/ui/primitives";
import { productDescription, productHighlights, productSpecs } from "@/data";
import { resolvePublicImage } from "@/lib/public-files";
import { PLACEHOLDER_SLUG, withPlaceholder } from "@/lib/static-params";
import { compactCount } from "@/lib/utils";
import { defaultVariant, hasOptions, variantLineId } from "@/lib/variants";
import { getApproximateNow } from "@/server/clock";
import {
  getCategoryBySlug,
  getProductPage,
  getProductSlugs,
  getRelatedProducts,
  getSubcategoryOf,
} from "@/server/services/catalog";
import { getProductReviewSummary } from "@/server/services/reviews";
import { getCommerceSettings } from "@/server/services/settings";
import { findRenamedSlug } from "@/server/services/slug-history";
import { ProductJsonLd } from "./json-ld";

/**
 * One template for the whole catalogue, now reading from Postgres through the
 * catalogue service. `productDescription`/`productHighlights`/`productSpecs`
 * stay imported from @/data — they are pure functions over a Product, not data,
 * and still fall back to category copy when a product has no description.
 *
 * Prerendered per product at build time — a product page is the single most
 * SEO-important page type on the site, and static HTML is the fastest thing we
 * can hand a phone on a 4G connection.
 */
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  // A shop with no products still has to build. See static-params.ts.
  return withPlaceholder(
    slugs.map((slug) => ({ slug })),
    { slug: PLACEHOLDER_SLUG },
  );
}

export async function generateMetadata(
  props: PageProps<"/product/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  // Same cached read the page itself uses, so this costs a cache hit rather
  // than a second query.
  const product = (await getProductPage(slug))?.product;
  if (!product) return { title: "Product not found" };

  const description = productDescription(product);
  const image = resolvePublicImage(product.image.src);

  return {
    title: `${product.title} — ${product.brand}`,
    description: description.slice(0, 155),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description: description.slice(0, 155),
      url: `/product/${product.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  // One read for both — see getProductPage.
  const page = await getProductPage(slug);
  if (!page) {
    // The slug may have been renamed rather than deleted. A 301 keeps the
    // ranking and the inbound links; a 404 throws both away.
    const renamed = await findRenamedSlug("product", slug);
    if (renamed) permanentRedirect(`/product/${renamed}`);
    notFound();
  }

  const { product, gallery } = page;

  const [category, subcategory, related, commerce, reviewSummary, now] =
    await Promise.all([
      getCategoryBySlug(product.category),
      getSubcategoryOf(slug),
      getRelatedProducts(product.category, slug),
      getCommerceSettings(),
      getProductReviewSummary(product.id),
      getApproximateNow(),
    ]);
  const price = product.flash?.price ?? product.price;
  const highlights = productHighlights(product, commerce);
  const specs = productSpecs(product, commerce);
  const Icon = categoryIcon(product.category);

  // Browser-only: the server cannot know a view happened, and this is an
  // audience signal rather than a conversion. See meta-events.tsx.
  const line = {
    id: product.id,
    productId: product.id,
    slug: product.slug,
    title: product.title,
    price,
    compareAt: product.compareAt,
    imageSrc: product.image.src,
    imageAlt: product.image.alt,
    imageReady: resolvePublicImage(product.image.src) !== null,
    freeDelivery: product.freeDelivery,
  };

  // The sticky bar only ever adds when there is nothing to choose, so it can
  // resolve its line id up front. It has to be the *same* id the buy box
  // would produce for the same product, or a single-colourway item would land
  // as two cart lines depending on which button was pressed.
  const baseVariant = defaultVariant(product);
  const quickLine = {
    ...line,
    id: variantLineId(product.id, baseVariant),
    variant: baseVariant.colour || baseVariant.size ? baseVariant : undefined,
  };

  return (
    <>
      <MetaViewContent
        slug={product.slug}
        name={product.title}
        value={price}
        category={product.category}
      />
      <ProductJsonLd product={product} />

      {/* Bottom padding clears the mobile buy bar; the bottom nav hides itself
          on this route so the two never stack. */}
      <div className="container-page pt-3 pb-28 lg:pb-14">
        <Breadcrumb
          className="mb-3"
          items={[
            { label: "Home", href: "/" },
            ...(category
              ? [{ label: category.name, href: `/category/${category.slug}` }]
              : []),
            ...(category && subcategory
              ? [
                  {
                    label: subcategory.name,
                    href: `/category/${category.slug}/${subcategory.slug}`,
                  },
                ]
              : []),
            { label: product.title },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery
              alts={gallery.map((g) => g.alt)}
              slides={gallery.map((asset, i) => (
                <Media
                  key={asset.src}
                  asset={asset}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  priority={i === 0}
                  icon={Icon}
                  fit="contain"
                />
              ))}
              thumbs={gallery.map((asset) => (
                <Media
                  key={asset.src}
                  asset={asset}
                  sizes="64px"
                  icon={Icon}
                  fit="contain"
                />
              ))}
            />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold tracking-wide text-brand-on uppercase">
                {product.brand}
              </p>
              <h1 className="mt-1 text-xl leading-tight font-extrabold text-ink sm:text-2xl lg:text-3xl">
                {product.title}
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {/* min-h-11: the rating is a jump link to the reviews, and at
                    its natural 20px it was under the 24px WCAG 2.5.8 floor. */}
                {/* The anchor only exists when there is a rating to click
                    through to — an empty 44px tap target next to "sold" is a
                    dead zone people hit by accident. */}
                {product.reviewCount > 0 && (
                  <a
                    href="#reviews"
                    className="inline-flex min-h-11 items-center tap"
                  >
                    <Rating
                      value={product.rating}
                      count={product.reviewCount}
                      size="md"
                    />
                  </a>
                )}
                <span className="text-sm text-ink-3">
                  {compactCount(product.sold)} sold
                </span>
                {product.stock > 0 ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-success">
                    <Check aria-hidden className="size-4" strokeWidth={2.5} />
                    In stock
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-danger">
                    Out of stock
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-card bg-surface-2 p-4">
              <Price price={price} compareAt={product.compareAt} size="lg" />
              {product.flash && (
                <p className="mt-1.5 flex items-center gap-2">
                  <Badge tone="danger">Flash sale</Badge>
                  <span className="text-xs font-semibold text-danger">
                    {product.flash.claimedPercent}% claimed — ends tonight
                  </span>
                </p>
              )}
              {product.freeDelivery && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-success">
                  <Truck aria-hidden className="size-4" />
                  Free delivery on this item
                </p>
              )}
            </div>

            <BuyBox
              product={{
                base: line,
                slug: product.slug,
                stock: product.stock,
                colors: product.colors,
                sizes: product.sizes,
              }}
            />

            <DeliveryPanel freeDelivery={product.freeDelivery} />
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-10">
          <section aria-labelledby="about-heading">
            <h2
              id="about-heading"
              className="mb-3 text-lg font-extrabold text-ink sm:text-xl"
            >
              About this product
            </h2>
            <p className="text-sm leading-relaxed text-ink-2">
              {productDescription(product)}
            </p>

            <ul className="mt-4 space-y-2">
              {highlights.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-ink-2"
                >
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-success"
                    strokeWidth={2.5}
                  />
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="specs-heading">
            <h2
              id="specs-heading"
              className="mb-3 text-lg font-extrabold text-ink sm:text-xl"
            >
              Specifications
            </h2>
            <dl className="overflow-hidden rounded-card border border-line">
              {specs.map((spec, i) => (
                <div
                  key={spec.label}
                  className={`flex gap-4 px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? "bg-surface-2" : "bg-surface"
                  }`}
                >
                  <dt className="w-32 shrink-0 text-ink-3">{spec.label}</dt>
                  {/* `wrap-anywhere`, not just `min-w-0`: the SKU is a 25-character
                      id with nothing to break on, so its min-content width set a
                      floor on this grid column and pushed the whole page into
                      horizontal scroll at 360px. min-width:0 lets a flex item
                      shrink, but the unbreakable word still had to fit. */}
                  <dd className="min-w-0 wrap-anywhere font-medium text-ink">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="mt-10 lg:mt-14">
          <ProductReviews
            productId={product.id}
            summary={reviewSummary}
            now={now}
          />
        </div>
      </div>

      {related.length > 0 && (
        <div className="pb-28 lg:pb-14">
          <ProductRail
            id="related"
            title={`More in ${category?.name ?? "this category"}`}
            subtitle="Customers viewing this also looked at these"
            href={`/category/${product.category}`}
            products={related}
          />
        </div>
      )}

      <StickyBuyBar
        line={quickLine}
        compareAt={product.compareAt}
        needsOptions={hasOptions(product)}
      />
    </>
  );
}
