import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { listBrands, listCategories } from "@/server/services/admin/taxonomy";
import { BrandManager } from "./brand-manager";
import { CategoryList } from "./category-list";

export const instant = false;
export const metadata: Metadata = { title: "Categories" };

/**
 * Categories and brands.
 *
 * They share a screen because they are the same job — the vocabulary products
 * are filed under — and because brands are too small to earn a sidebar entry
 * of their own.
 */
export default async function AdminCategoriesPage() {
  await connection();
  await requirePermission({ category: ["read"] });

  const [categories, brands] = await Promise.all([
    listCategories(),
    listBrands(),
  ]);

  const active = categories.filter((c) => !c.isArchived).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Categories"
        subtitle={`${active} live ${
          active === 1 ? "category" : "categories"
        }. The order here is the order shoppers see.`}
        actions={
          <Link
            href="/admin/categories/new"
            className={adminButton("primary", "md")}
          >
            <Plus aria-hidden className="size-4" />
            New category
          </Link>
        }
      />

      <div className="mt-5">
        <CategoryList initial={categories} />
      </div>

      <div className="mt-8">
        <BrandManager initial={brands} />
      </div>
    </div>
  );
}
