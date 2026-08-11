import { headers } from "next/headers";
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Admin audit trail.
 *
 * Every admin mutation records who did what, and what the row looked like
 * before and after. On a store where staff can change prices and cancel orders,
 * "who marked this delivered?" is a question that gets asked for real — and the
 * answer has to survive the person who did it leaving.
 *
 * Deliberately never throws: a failure to write the log must not roll back the
 * business action the user actually asked for. It logs to the console instead
 * so the failure is still visible.
 */
export async function recordAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  try {
    const h = await headers();
    await prisma.adminAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: params.before,
        after: params.after,
        // Behind a proxy the first x-forwarded-for entry is the real client.
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    console.error("audit log write failed", params.action, e);
  }
}
