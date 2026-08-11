import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { CategoryForm, EMPTY_CATEGORY } from "../category-form";

export const instant = false;
export const metadata: Metadata = { title: "New category" };

export default async function NewCategoryPage() {
  await connection();
  await requirePermission({ category: ["create"] });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/admin/categories", label: "Categories" }}
        title="New category"
        subtitle="Subcategories can be added once it is saved."
      />

      <div className="mt-5">
        <CategoryForm initial={EMPTY_CATEGORY} />
      </div>
    </div>
  );
}
