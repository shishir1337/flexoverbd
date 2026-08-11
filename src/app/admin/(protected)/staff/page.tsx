import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { listStaff } from "@/server/services/admin/staff";
import { StaffManager } from "./staff-manager";

export const instant = false;
export const metadata: Metadata = { title: "Staff" };

/**
 * Staff access.
 *
 * Owner-only: `staff` permissions are held by that role alone, so a manager
 * opening this URL gets the permission page rather than a list of colleagues
 * they cannot change.
 */
export default async function AdminStaffPage() {
  await connection();
  const session = await requirePermission({ staff: ["read"] });

  const staff = await listStaff();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Staff"
        subtitle="Who can sign in to this admin, and what each of them can change."
      />

      <div className="mt-5">
        <StaffManager staff={staff} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
