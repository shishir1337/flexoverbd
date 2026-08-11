import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Role definitions.
 *
 * Four roles, chosen from how a small Bangladeshi storefront actually runs:
 * the owner does everything, a manager runs the shop but cannot add staff or
 * change payout-adjacent settings, and staff exist to work the phone and move
 * orders along — which is the bulk of daily COD work.
 *
 * `defaultStatements` carries Better Auth's own user/session permissions so the
 * admin plugin keeps working; ours are added alongside.
 */
export const statement = {
  ...defaultStatements,
  product: ["create", "read", "update", "delete", "publish"],
  category: ["create", "read", "update", "delete"],
  inventory: ["read", "adjust"],
  order: ["read", "update-status", "cancel", "refund", "export"],
  customer: ["read", "update", "ban"],
  content: ["create", "read", "update", "delete", "publish"],
  media: ["upload", "read", "delete"],
  marketing: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  staff: ["invite", "read", "update", "remove"],
  audit: ["read"],
} as const;

export const ac = createAccessControl(statement);

/** Shop floor: work the order queue, nothing else. */
export const staff = ac.newRole({
  order: ["read", "update-status", "cancel"],
  customer: ["read"],
  inventory: ["read"],
  product: ["read"],
});

/** Runs the shop day to day. No staff management, no settings. */
export const manager = ac.newRole({
  product: ["create", "read", "update", "delete", "publish"],
  category: ["create", "read", "update", "delete"],
  inventory: ["read", "adjust"],
  order: ["read", "update-status", "cancel", "refund", "export"],
  customer: ["read", "update"],
  content: ["create", "read", "update", "delete", "publish"],
  media: ["upload", "read", "delete"],
  marketing: ["create", "read", "update", "delete"],
  settings: ["read"],
});

/** Everything, including staff and settings. */
export const owner = ac.newRole({
  ...adminAc.statements,
  product: ["create", "read", "update", "delete", "publish"],
  category: ["create", "read", "update", "delete"],
  inventory: ["read", "adjust"],
  order: ["read", "update-status", "cancel", "refund", "export"],
  customer: ["read", "update", "ban"],
  content: ["create", "read", "update", "delete", "publish"],
  media: ["upload", "read", "delete"],
  marketing: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  staff: ["invite", "read", "update", "remove"],
  audit: ["read"],
});

/** Shoppers. No admin capability at all — the storefront needs none. */
export const customer = ac.newRole({});

export const roles = { owner, manager, staff, customer };

export type AppRole = keyof typeof roles;

/** Roles that may see /admin at all. */
export const ADMIN_ROLES: AppRole[] = ["owner", "manager", "staff"];

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as AppRole);
}
