"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/server/audit";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Staff access control.
 *
 * Two rules run through everything here, and both exist because the failure is
 * unrecoverable through the UI:
 *
 *  - **Nobody can change their own role or ban themselves.** An owner who
 *    demotes themselves has locked the last door from the inside; the only way
 *    back is a database console.
 *  - **The last active owner cannot be demoted or banned.** Same outcome,
 *    reached by two people instead of one.
 */

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "manager", "staff"]),
});

/** Owners still standing if this user were removed from the role. */
async function otherActiveOwners(excludingUserId: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "owner",
      banned: { not: true },
      id: { not: excludingUserId },
    },
  });
}

export async function setStaffRole(
  input: z.input<typeof roleSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ staff: ["update"] });

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, role } = parsed.data;

  if (userId === session.user.id) {
    return {
      ok: false,
      error: "You cannot change your own role. Ask another owner.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  });
  if (!target) return { ok: false, error: "That user no longer exists." };

  if (
    target.role === "owner" &&
    role !== "owner" &&
    (await otherActiveOwners(userId)) === 0
  ) {
    return {
      ok: false,
      error: "This is the last owner. Promote someone else first.",
    };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });

  await recordAudit({
    userId: session.user.id,
    action: "staff.role.update",
    entity: "User",
    entityId: userId,
    before: { role: target.role },
    after: { role },
  });

  revalidatePath("/admin/staff");
  return { ok: true, message: `${target.name} is now ${role}.` };
}

const banSchema = z.object({
  userId: z.string().min(1),
  banned: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export async function setStaffBanned(
  input: z.input<typeof banSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ staff: ["remove"] });

  const parsed = banSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { userId, banned, reason } = parsed.data;

  if (userId === session.user.id) {
    return { ok: false, error: "You cannot suspend your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  });
  if (!target) return { ok: false, error: "That user no longer exists." };

  if (
    banned &&
    target.role === "owner" &&
    (await otherActiveOwners(userId)) === 0
  ) {
    return {
      ok: false,
      error: "This is the last owner. Promote someone else first.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      banned,
      banReason: banned ? (reason ?? "Access removed by an owner.") : null,
      // Suspension is indefinite until lifted, not time-boxed.
      banExpires: null,
    },
  });

  // Existing sessions survive a ban flag otherwise: the cookie cache means the
  // suspended person keeps working for up to a minute, and any long-lived
  // session stays valid until it expires. Revoking is what makes it immediate.
  if (banned) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await recordAudit({
    userId: session.user.id,
    action: banned ? "staff.suspend" : "staff.restore",
    entity: "User",
    entityId: userId,
    after: { banned, reason: reason ?? null },
  });

  revalidatePath("/admin/staff");
  return {
    ok: true,
    message: banned
      ? `${target.name} can no longer sign in.`
      : `${target.name} has access again.`,
  };
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  role: z.enum(["owner", "manager", "staff"]),
});

/**
 * Add a staff member.
 *
 * Creates the account with a password the owner sets and hands over, because
 * there is no email provider wired yet — a real invite link needs one. The
 * account goes through Better Auth's own sign-up rather than a direct row
 * insert, so the password is hashed by the same code path that verifies it.
 */
export async function inviteStaff(
  input: z.input<typeof inviteSchema>,
): Promise<ActionResult> {
  const session = await requirePermission({ staff: ["invite"] });

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: d.email },
    select: { id: true, role: true },
  });

  if (existing) {
    // A customer who already shops here being given staff access is a
    // promotion, not a duplicate account.
    if (existing.role && ADMIN_ROLES.includes(existing.role as never)) {
      return { ok: false, error: "They already have admin access." };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: d.role },
    });
    await recordAudit({
      userId: session.user.id,
      action: "staff.promote",
      entity: "User",
      entityId: existing.id,
      after: { role: d.role },
    });
    revalidatePath("/admin/staff");
    return {
      ok: true,
      message: `${d.email} already had an account — it now has ${d.role} access.`,
    };
  }

  try {
    const created = await auth.api.signUpEmail({
      body: { name: d.name, email: d.email, password: d.password },
    });

    await prisma.user.update({
      where: { id: created.user.id },
      data: { role: d.role },
    });

    await recordAudit({
      userId: session.user.id,
      action: "staff.invite",
      entity: "User",
      entityId: created.user.id,
      after: { email: d.email, role: d.role },
    });

    revalidatePath("/admin/staff");
    return {
      ok: true,
      message: `${d.name} can sign in now. Send them the password yourself.`,
    };
  } catch (e) {
    console.error("inviteStaff failed", e);
    return { ok: false, error: "Could not create the account. Please retry." };
  }
}
