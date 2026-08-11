import { AlertCircle, FolderPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { createDraftProduct } from "@/server/services/admin/product-actions";

export const instant = false;
export const metadata: Metadata = { title: "New product" };

/**
 * "New product" is a doorway, not a form.
 *
 * The old screen asked for details, saved, and only then revealed photos and
 * variants — two mental phases for one job, and a page you could not finish the
 * product on. Shopify and WooCommerce show everything at once; the reason they
 * can is that the row already exists behind the scenes.
 *
 * So this creates the draft and sends you to the real editor, where details,
 * photos and variants are all present from the first moment. The draft is
 * unpublished and inactive, so nothing reaches the storefront until it is
 * deliberately published.
 */
export default async function NewProductPage() {
  await connection();
  await requirePermission({ product: ["create"] });

  const result = await createDraftProduct();

  if (result.ok && result.data) {
    redirect(`/admin/products/${result.data.id}`);
  }

  // The only expected failure is having no categories yet, which is a real
  // prerequisite rather than an error — a product has to live somewhere.
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/admin/products", label: "All products" }}
        title="New product"
      />
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <AlertCircle aria-hidden className="mx-auto size-8 text-warn" />
        <p className="mt-3 font-bold text-ink">
          {result.ok ? "Could not start a product." : result.error}
        </p>
        <p className="mt-1 text-ink-3 text-sm">
          Every product belongs to a category, so there needs to be at least one
          before you can add stock.
        </p>
        <Link
          href="/admin/categories/new"
          className={adminButton("primary", "md", "mt-4")}
        >
          <FolderPlus aria-hidden className="size-4" />
          Create a category
        </Link>
      </div>
    </div>
  );
}
