import { PackageSearch, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import {
  getCategoryOptions,
  listProducts,
  type ProductFilters,
  type ProductSort,
} from "@/server/services/admin/products";
import { ProductsTable } from "./products-table";

/**
 * Blocking route: per-user, behind auth, live catalogue data. Nothing here is
 * worth prerendering as a shell.
 */
export const instant = false;

export const metadata: Metadata = { title: "Products" };

const STATUSES = [
  { key: undefined, label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
] as const;

const SORTS = [
  { key: "recent", label: "Recently edited" },
  { key: "title", label: "A–Z" },
  // Ordered within the page only — total stock is summed in memory, so the
  // database cannot sort by it. Useful for triaging a filtered list.
  { key: "stock-low", label: "Lowest stock" },
  { key: "price-high", label: "Highest price" },
] as const;

export default async function AdminProductsPage(
  props: PageProps<"/admin/products">,
) {
  await connection();
  await requirePermission({ product: ["read"] });

  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const categoryId = typeof sp.category === "string" ? sp.category : undefined;
  const status =
    sp.status === "published" ||
    sp.status === "draft" ||
    sp.status === "archived"
      ? (sp.status as ProductFilters["status"])
      : undefined;
  const page = Number(sp.page) || 1;
  const sort =
    sp.sort === "title" || sp.sort === "stock-low" || sp.sort === "price-high"
      ? (sp.sort as ProductSort)
      : "recent";

  const [{ products, total, pageCount }, categories] = await Promise.all([
    listProducts({ q, categoryId, status, sort, page }),
    getCategoryOptions(),
  ]);

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      q,
      category: categoryId,
      status,
      sort: sort === "recent" ? undefined : sort,
      ...next,
    };
    for (const [k, v] of Object.entries(merged))
      if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Products"
        subtitle={`${total} ${total === 1 ? "product" : "products"}`}
        actions={
          <Link
            href="/admin/products/new"
            className={adminButton("primary", "md")}
          >
            <Plus aria-hidden className="size-4" />
            New product
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s.label}
            href={href({ status: s.key, page: undefined })}
            className={cn(
              "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
              status === s.key
                ? "border-brand-500 bg-brand-soft text-brand-on"
                : "border-line text-ink-2 hover:bg-surface-2",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mt-3 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Title, slug or brand"
          className="h-10 w-full max-w-xs rounded-btn border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
        />
        <select
          name="category"
          defaultValue={categoryId ?? ""}
          className="h-10 rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          aria-label="Sort products"
          className="h-10 rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={adminButton("secondary", "md", "shrink-0")}
        >
          Filter
        </button>
      </form>

      <div className="mt-4">
        {products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            body={
              q || categoryId || status
                ? "Try clearing the filters above."
                : "Create your first product to get started."
            }
            action={
              <Link
                href="/admin/products/new"
                className={adminButton("primary", "md")}
              >
                <Plus aria-hidden className="size-4" />
                New product
              </Link>
            }
          />
        ) : (
          <ProductsTable
            products={products.map((p) => ({
              id: p.id,
              title: p.title,
              brand: p.brand?.name ?? "No brand",
              category: p.category.name,
              variantCount: p.variantCount,
              totalStock: p.totalStock,
              price: p.price,
              thumbnail: p.images[0]?.media.url ?? null,
              state: p.archivedAt
                ? ("archived" as const)
                : p.isActive && p.publishedAt
                  ? ("published" as const)
                  : ("draft" as const),
            }))}
          />
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={href({ page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={cn(
              "rounded-btn border border-line px-4 py-2 font-semibold text-sm tap",
              page <= 1
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-2",
            )}
          >
            Previous
          </Link>
          <span className="text-ink-3 text-sm tnum">
            Page {page} of {pageCount}
          </span>
          <Link
            href={href({ page: String(page + 1) })}
            aria-disabled={page >= pageCount}
            className={cn(
              "rounded-btn border border-line px-4 py-2 font-semibold text-sm tap",
              page >= pageCount
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-2",
            )}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
