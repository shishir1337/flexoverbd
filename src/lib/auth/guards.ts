import { headers } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import "server-only";
import { auth } from "./index";
import { type AppRole, isAdminRole, type statement } from "./permissions";

/**
 * Authorization guards.
 *
 * Server Actions are public HTTP endpoints — the fact that the UI only rendered
 * a button for owners means nothing. Every action and every admin page calls one
 * of these first. There is no "the caller already checked" path.
 */

type Permissions = Partial<{
  [K in keyof typeof statement]: (typeof statement)[K][number][];
}>;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Any signed-in user. Used by account pages, not by admin. */
export async function requireUser() {
  const session = await getSession();
  if (!session) unauthorized();
  return session;
}

/**
 * Gate for /admin. Redirects rather than 401s so a logged-out staff member
 * lands on the login form instead of a dead end.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  if (session.user.banned) redirect("/admin/login?banned=1");
  if (!isAdminRole(session.user.role)) forbidden();

  return session;
}

/**
 * Fine-grained check. Throws rather than returning a boolean so a forgotten
 * `if` cannot silently allow the write.
 */
export async function requirePermission(permissions: Permissions) {
  const session = await requireAdmin();

  const { success } = await auth.api.userHasPermission({
    body: { userId: session.user.id, permissions: permissions as never },
  });

  if (!success) forbidden();
  return session;
}

/** Non-throwing variant, for hiding UI the user cannot use. */
export async function can(permissions: Permissions): Promise<boolean> {
  const session = await getSession();
  if (!session || !isAdminRole(session.user.role)) return false;

  const { success } = await auth.api.userHasPermission({
    body: { userId: session.user.id, permissions: permissions as never },
  });
  return success;
}

export function roleOf(session: { user: { role?: string | null } } | null) {
  return (session?.user.role ?? "customer") as AppRole;
}
