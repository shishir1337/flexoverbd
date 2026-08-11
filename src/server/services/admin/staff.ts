import "server-only";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Who can sign in to the admin.
 *
 * Read separately from the customer list because they answer different
 * questions — customers are people who bought something, staff are people who
 * can change things — and because this one is owner-only.
 */

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  /** Last time they actually did something, from the audit log. */
  lastActionAt: string | null;
  actionCount: number;
};

export async function listStaff(): Promise<StaffRow[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ADMIN_ROLES } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      createdAt: true,
    },
  });

  if (users.length === 0) return [];

  // Grouped rather than a per-user query: this list is small but it is the
  // shape that turns into N+1 the moment a shop hires a few more people.
  const activity = await prisma.adminAuditLog.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  const byUser = new Map(activity.map((a) => [a.userId, a]));

  return users.map((u) => {
    const stats = byUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? "staff",
      banned: Boolean(u.banned),
      createdAt: u.createdAt.toISOString().slice(0, 10),
      lastActionAt: stats?._max.createdAt?.toISOString().slice(0, 10) ?? null,
      actionCount: stats?._count._all ?? 0,
    };
  });
}

export type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorName: string;
  createdAt: string;
};

/**
 * The audit trail.
 *
 * Every admin mutation writes one of these. Showing them is what makes the
 * trail useful rather than merely present — "who changed this price" is the
 * question it exists to answer.
 */
export async function listAuditLog(limit = 50): Promise<AuditRow[]> {
  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId ?? "",
    actorName: r.user?.name ?? "Removed user",
    createdAt: r.createdAt.toISOString(),
  }));
}
