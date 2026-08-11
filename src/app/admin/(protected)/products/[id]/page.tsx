import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { DRAFT_TITLE } from "@/lib/product-draft";
import {
  getAdminProduct,
  getBrandOptions,
  getCategoryOptions,
} from "@/server/services/admin/products";
import { ProductForm } from "../product-form";
import { ArchiveToggle } from "./archive-toggle";
import { ImageGallery } from "./image-gallery";
import { VariantManager } from "./variant-manager";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/admin/products/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const product = await getAdminProduct(id);
  return { title: product ? `Edit ${product.title}` : "Product" };
}

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">,
) {
  await connection();
  await requirePermission({ product: ["update"] });

  const { id } = await props.params;
  const [product, categories, brands] = await Promise.all([
    getAdminProduct(id),
    getCategoryOptions(),
    getBrandOptions(),
  ]);
  if (!product) notFound();

  // A draft still carrying its placeholder is presented as blank, so the title
  // and slug fields start empty and the slug can follow what gets typed. Once
  // either has been edited this is false and the real values show through.
  const isPristineDraft =
    product.title === DRAFT_TITLE &&
    product.price === 0 &&
    !product.publishedAt;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/products", label: "All products" }}
        title={isPristineDraft ? "New product" : product.title}
        actions={
          <>
            <Link
              href={`/product/${product.slug}`}
              target="_blank"
              className={adminButton("secondary")}
            >
              <ExternalLink aria-hidden className="size-4" />
              View
            </Link>
            <ArchiveToggle
              id={product.id}
              archived={Boolean(product.archivedAt)}
            />
          </>
        }
      />

      {product.archivedAt && (
        <p className="mb-5 rounded-btn bg-surface-3 px-3.5 py-3 text-ink-2 text-sm">
          This product is archived. It is hidden from the storefront and the
          sitemap, but existing orders that reference it are unaffected.
        </p>
      )}

      <div className="space-y-5">
        <ProductForm
          categories={categories}
          brands={brands}
          initial={{
            id: product.id,
            title: isPristineDraft ? "" : product.title,
            slug: isPristineDraft ? "" : product.slug,
            brandId: product.brandId,
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
            description: product.description,
            price: isPristineDraft ? "" : String(product.price),
            compareAt: product.compareAt ? String(product.compareAt) : "",
            badge: product.badge,
            freeDelivery: product.freeDelivery,
            tags: product.tags.join(", "),
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            isActive: product.isActive,
            isPublished: Boolean(product.publishedAt),
          }}
        />

        <ImageGallery
          productId={product.id}
          images={product.images.map((i) => ({
            id: i.id,
            mediaId: i.mediaId,
            url: i.media.url,
            alt: i.alt || i.media.alt,
          }))}
        />

        <VariantManager
          productId={product.id}
          basePrice={product.price}
          variants={product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            colourName: v.colourName,
            colourHex: v.colourHex,
            sizeValue: v.sizeValue,
            sizeLabel: v.sizeLabel,
            sizeSystem: v.sizeSystem,
            priceOverride: v.priceOverride,
            stock: v.stock,
            isActive: v.isActive,
          }))}
        />
      </div>
    </div>
  );
}
