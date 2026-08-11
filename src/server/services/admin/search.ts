"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

/**
 * One search box for the whole admin.
 *
 * Staff arrive knowing a *thing* — a customer on the phone, a package in hand,
 * a product a colleague mentioned — not which of nine screens holds it. Without
 * this, finding order FB-260805-1894 means: guess Orders, wait for the list,
 * find the filter, type, wait again.
 *
 * Deliberately shallow: a few rows per type, ranked by how exactly they match.
 * This is a jump-to, not a report — the per-screen filters remain the place to
 * ask real questions of the data.
 */

export type SearchHit = {
  id: string;
  kind: "order" | "product" | "customer" | "category";
  title: string;
  detail: string;
  href: string;
};

const PER_KIND = 5;

export async function adminSearch(raw: string): Promise<SearchHit[]> {
  // Every admin can search; each result links to a screen that runs its own
  // permission check, so a hit is never itself an escalation.
  await requireAdmin();

  const q = raw.trim();
  if (q.length < 2) return [];

  const [orders, products, customers, categories] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: PER_KIND,
      select: {
        id: true,
        number: true,
        customerName: true,
        status: true,
        total: true,
      },
    }),

    prisma.product.findMany({
      where: {
        archivedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: PER_KIND,
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
      },
    }),

    // Customers are order rows grouped by phone, not user accounts — this is a
    // guest-checkout shop, and most buyers never register.
    prisma.order.findMany({
      where: {
        OR: [
          { customerName: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q } },
        ],
      },
      distinct: ["customerPhone"],
      orderBy: { createdAt: "desc" },
      take: PER_KIND,
      select: { customerName: true, customerPhone: true },
    }),

    prisma.category.findMany({
      where: { archivedAt: null, name: { contains: q, mode: "insensitive" } },
      take: 3,
      select: { id: true, name: true },
    }),
  ]);

  const hits: SearchHit[] = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      kind: "order" as const,
      title: o.number,
      detail: `${o.customerName} · ${o.status.toLowerCase()} · ৳${o.total.toLocaleString("en-GB")}`,
      href: `/admin/orders/${o.number}`,
    })),
    ...products.map((p) => ({
      id: `product-${p.id}`,
      kind: "product" as const,
      title: p.title,
      detail: p.category.name,
      href: `/admin/products/${p.id}`,
    })),
    ...customers.map((c) => ({
      id: `customer-${c.customerPhone}`,
      kind: "customer" as const,
      title: c.customerName,
      detail: c.customerPhone,
      href: `/admin/customers/${encodeURIComponent(c.customerPhone)}`,
    })),
    ...categories.map((c) => ({
      id: `category-${c.id}`,
      kind: "category" as const,
      title: c.name,
      detail: "Category",
      href: `/admin/categories/${c.id}`,
    })),
  ];

  // An exact match goes first. Someone who typed a full order number wants that
  // order, not the four products whose titles happen to contain the digits.
  const needle = q.toLowerCase();
  return hits.sort((a, b) => score(b, needle) - score(a, needle));
}

function score(hit: SearchHit, needle: string) {
  const title = hit.title.toLowerCase();
  if (title === needle) return 3;
  if (title.startsWith(needle)) return 2;
  return 1;
}
