import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { getCategoryDetail } from "@/server/services/admin/taxonomy";
import { CategoryForm } from "../category-form";
import { SubcategoryManager } from "./subcategory-manager";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/admin/categories/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const category = await getCategoryDetail(id);
  return { title: category ? `Edit ${category.name}` : "Category" };
}

export default async function EditCategoryPage(
  props: PageProps<"/admin/categories/[id]">,
) {
  await connection();
  await requirePermission({ category: ["read"] });

  const { id } = await props.params;
  const category = await getCategoryDetail(id);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/categories", label: "Categories" }}
        title={category.name}
        subtitle={`${category.productCount} ${
          category.productCount === 1 ? "product" : "products"
        }${category.isArchived ? " · archived" : ""}`}
        actions={
          <a
            href={`/category/${category.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={adminButton("secondary")}
          >
            <ExternalLink aria-hidden className="size-4" />
            View
          </a>
        }
      />

      <div className="mt-5 space-y-5">
        <CategoryForm
          initial={{
            id: category.id,
            name: category.name,
            slug: category.slug,
            shortName: category.shortName,
            blurb: category.blurb,
            tint: category.tint,
            isActive: category.isActive,
            seoTitle: category.seoTitle,
            seoDescription: category.seoDescription,
          }}
        />

        <SubcategoryManager
          categoryId={category.id}
          categorySlug={category.slug}
          subcategories={category.subcategories}
        />
      </div>
    </div>
  );
}
