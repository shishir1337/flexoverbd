"use client";

import { Ban, Plus, ShieldCheck, Undo2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Field, FormError, inputCls } from "@/components/admin/form";
import { Chip, EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { StaffRow } from "@/server/services/admin/staff";
import {
  inviteStaff,
  setStaffBanned,
  setStaffRole,
} from "@/server/services/admin/staff-actions";

type Role = "owner" | "manager" | "staff";

const ROLES: { value: Role; label: string; blurb: string }[] = [
  {
    value: "staff",
    label: "Staff",
    blurb: "Work the order queue. Cannot change prices or settings.",
  },
  {
    value: "manager",
    label: "Manager",
    blurb: "Everything except settings and staff access.",
  },
  {
    value: "owner",
    label: "Owner",
    blurb: "Full access, including this page.",
  },
];

const ROLE_TONE: Record<string, "brand" | "success" | "neutral"> = {
  owner: "brand",
  manager: "success",
  staff: "neutral",
};

/**
 * Staff list.
 *
 * The rules that matter — no self-demotion, no removing the last owner — are
 * enforced server-side, but the controls are also disabled here so nobody
 * discovers them by getting an error. The row for whoever is signed in says so
 * explicitly rather than just being inert.
 */
export function StaffManager({
  staff,
  currentUserId,
}: {
  staff: StaffRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const baseId = useId();

  const [inviting, setInviting] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as Role,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeOwners = staff.filter(
    (s) => s.role === "owner" && !s.banned,
  ).length;

  function changeRole(row: StaffRow, role: Role) {
    setError(null);
    startTransition(async () => {
      const result = await setStaffRole({ userId: row.id, role });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: result.message ?? "Role updated." });
      router.refresh();
    });
  }

  async function toggleBan(row: StaffRow) {
    if (!row.banned) {
      const ok = await confirm({
        title: `Suspend ${row.name}?`,
        body: "They will be signed out immediately and cannot sign in again until you restore them. Their account and audit history are kept.",
        confirmLabel: "Suspend",
      });
      if (!ok) return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setStaffBanned({
        userId: row.id,
        banned: !row.banned,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({ tone: "success", message: result.message ?? "Updated." });
      router.refresh();
    });
  }

  function submitInvite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteStaff(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ tone: "success", message: result.message ?? "Added." });
      setInviting(false);
      setDraft({ name: "", email: "", password: "", role: "staff" });
      router.refresh();
    });
  }

  const ids = {
    name: `${baseId}-name`,
    email: `${baseId}-email`,
    password: `${baseId}-password`,
    role: `${baseId}-role`,
  };

  return (
    <div>
      {dialog}

      <div className="mb-4 flex justify-end">
        {!inviting && (
          <button
            type="button"
            onClick={() => setInviting(true)}
            className={adminButton("primary", "md")}
          >
            <Plus aria-hidden className="size-4" />
            Add staff
          </button>
        )}
      </div>

      {inviting && (
        <section className="mb-4 rounded-card border border-brand-200 bg-brand-soft p-4 sm:p-5">
          <h2 className="font-extrabold text-ink text-sm">
            Add a staff member
          </h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            Email delivery is not wired up yet, so you set the password here and
            pass it on. They can change it from the sign-in page afterwards.
          </p>

          <div className="mt-4 space-y-3.5">
            <FormError message={error} />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field id={ids.name} label="Name">
                <input
                  id={ids.name}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  className={inputCls()}
                />
              </Field>
              <Field id={ids.email} label="Email">
                <input
                  id={ids.email}
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  className={inputCls()}
                />
              </Field>
            </div>

            <Field
              id={ids.password}
              label="Temporary password"
              hint="At least 8 characters. Give it to them directly, not over a public channel."
            >
              <input
                id={ids.password}
                value={draft.password}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, password: e.target.value }))
                }
                className={cn(inputCls(), "font-mono")}
              />
            </Field>

            <fieldset>
              <legend className="font-semibold text-ink text-sm">Role</legend>
              <div className="mt-2 space-y-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-btn border p-3",
                      draft.role === r.value
                        ? "border-brand-500 bg-surface"
                        : "border-line bg-surface",
                    )}
                  >
                    <input
                      type="radio"
                      name={ids.role}
                      checked={draft.role === r.value}
                      onChange={() =>
                        setDraft((d) => ({ ...d, role: r.value }))
                      }
                      className="mt-0.5 size-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink text-sm">
                        {r.label}
                      </span>
                      <span className="block text-2xs text-ink-3">
                        {r.blurb}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitInvite}
                disabled={pending}
                className={adminButton("primary", "md")}
              >
                <UserPlus aria-hidden className="size-4" />
                {pending ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviting(false);
                  setError(null);
                }}
                className={adminButton("secondary", "md")}
              >
                <X aria-hidden className="size-4" />
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {staff.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No staff yet"
          body="Add someone to let them work the order queue."
        />
      ) : (
        <ul className="space-y-2">
          {staff.map((row) => {
            const isSelf = row.id === currentUserId;
            const isLastOwner =
              row.role === "owner" && !row.banned && activeOwners === 1;
            const locked = isSelf || isLastOwner;

            return (
              <li
                key={row.id}
                className={cn(
                  "rounded-card border bg-surface p-3.5",
                  row.banned ? "border-danger/30" : "border-line",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink text-sm">
                      <span className="truncate">{row.name}</span>
                      <Chip tone={ROLE_TONE[row.role] ?? "neutral"}>
                        {row.role}
                      </Chip>
                      {isSelf && <Chip>You</Chip>}
                      {row.banned && <Chip tone="danger">Suspended</Chip>}
                    </p>
                    <p className="mt-0.5 truncate text-2xs text-ink-3">
                      {row.email} · joined {row.createdAt}
                      {row.actionCount > 0
                        ? ` · ${row.actionCount} actions, last ${row.lastActionAt}`
                        : " · no activity yet"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={row.role}
                      disabled={locked || pending}
                      onChange={(e) => changeRole(row, e.target.value as Role)}
                      aria-label={`Role for ${row.name}`}
                      className="h-10 rounded-btn border border-line bg-surface px-2 text-ink text-sm focus:border-brand-500 focus:outline-none disabled:opacity-40"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => toggleBan(row)}
                      disabled={locked || pending}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-btn border px-3 font-semibold text-sm tap disabled:opacity-40",
                        row.banned
                          ? "border-line text-ink-2 hover:border-brand-500"
                          : "border-line text-ink-2 hover:border-danger hover:text-danger",
                      )}
                    >
                      {row.banned ? (
                        <>
                          <Undo2 aria-hidden className="size-4" />
                          Restore
                        </>
                      ) : (
                        <>
                          <Ban aria-hidden className="size-4" />
                          Suspend
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {locked && (
                  <p className="mt-2 text-2xs text-ink-3">
                    {isSelf
                      ? "You cannot change your own role or suspend yourself — ask another owner."
                      : "The last owner cannot be changed. Promote someone else first."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
