import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Reading the audit trail.
 *
 * The write side (`server/audit.ts`) has existed since the first admin action;
 * nothing could read it back, which made it a trail nobody could follow. On a
 * shop where staff can change a price, cancel an order or adjust stock, "who
 * marked this delivered?" gets asked for real, and the answer has to survive
 * the person who did it leaving.
 */

export const PAGE_SIZE = 50;

/**
 * Actions are recorded as dotted strings (`order.address.update`). Grouping by
 * the first segment gives a filter staff can reason about — "show me
 * everything that touched inventory" — without maintaining a second list that
 * drifts from the actions actually written.
 */
export const AUDIT_AREAS = [
  { value: "order", label: "Orders" },
  { value: "product", label: "Products" },
  { value: "variant", label: "Variants" },
  { value: "inventory", label: "Stock" },
  { value: "category", label: "Categories" },
  { value: "subcategory", label: "Subcategories" },
  { value: "brand", label: "Brands" },
  { value: "content", label: "Content" },
  { value: "media", label: "Media" },
  { value: "marketing", label: "Marketing" },
  { value: "review", label: "Reviews" },
  { value: "settings", label: "Settings" },
  { value: "staff", label: "Staff" },
] as const;

export type AuditFilters = {
  area?: string;
  userId?: string;
  /** Free text over the action and the record id. */
  q?: string;
  days?: number;
  page?: number;
};

function buildWhere(filters: AuditFilters) {
  const where: Record<string, unknown> = {};

  if (filters.area) where.action = { startsWith: `${filters.area}.` };
  if (filters.userId) where.userId = filters.userId;

  if (filters.days && filters.days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - filters.days);
    where.createdAt = { gte: since };
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entity: { contains: q, mode: "insensitive" } },
      { entityId: q },
    ];
  }

  return where;
}

export async function listAuditLog(filters: AuditFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        before: true,
        after: true,
        ip: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export type AuditRow = Awaited<ReturnType<typeof listAuditLog>>["rows"][number];

/**
 * Who appears in the log at all.
 *
 * Drawn from the log rather than the staff table so a departed colleague's
 * entries stay filterable — the whole point of keeping the trail.
 */
export async function getAuditActors() {
  const ids = await prisma.adminAuditLog.findMany({
    distinct: ["userId"],
    where: { userId: { not: null } },
    select: { userId: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: ids.map((r) => r.userId as string) } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return users;
}

/** The trail for one record, for the "history" panel on a detail screen. */
export async function getEntityHistory(
  entity: string,
  entityId: string,
  take = 20,
) {
  return prisma.adminAuditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      before: true,
      after: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
}
