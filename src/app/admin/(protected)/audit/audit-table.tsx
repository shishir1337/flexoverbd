"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AuditRow } from "@/server/services/admin/audit";

/**
 * The activity log.
 *
 * A row answers "who changed what, when" at a glance; expanding it answers
 * "changed it to what". The expanded view is a *diff* rather than two JSON
 * blobs — a stock adjustment writes `{stock: 12}` before and `{stock: 12,
 * delta: 0}` after, and asking someone to spot the difference between two
 * objects is how a log stops being read.
 */
export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-xs">
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const open = openId === row.id;
          const changes = diff(row.before, row.after);

          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left tap transition-colors hover:bg-surface-2"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-ink-4 transition-transform",
                    open && "rotate-90",
                  )}
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink text-sm">
                    {describe(row.action)}
                  </span>
                  <span className="block truncate text-2xs text-ink-3">
                    {row.user?.name || row.user?.email || "Deleted user"}
                    {row.entityId && (
                      <>
                        {" · "}
                        <span className="font-mono">{row.entity}</span>
                      </>
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-right text-2xs text-ink-3 tnum">
                  {when(row.createdAt)}
                </span>
              </button>

              {open && (
                <div className="border-line border-t bg-surface-2 px-4 py-3 sm:pl-11">
                  <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
                    <Meta label="Action">
                      <span className="font-mono text-xs">{row.action}</span>
                    </Meta>
                    {row.entityId && (
                      <Meta label="Record">
                        <span className="font-mono text-xs wrap-anywhere">
                          {row.entity} {row.entityId}
                        </span>
                      </Meta>
                    )}
                    <Meta label="When">
                      {row.createdAt.toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Meta>
                    {row.ip && (
                      <Meta label="From">
                        <span className="font-mono text-xs">{row.ip}</span>
                      </Meta>
                    )}
                  </dl>

                  {changes.length > 0 && (
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="text-left text-2xs text-ink-4 uppercase tracking-wide">
                          <th className="pb-1 font-semibold">Field</th>
                          <th className="pb-1 font-semibold">Before</th>
                          <th className="pb-1 font-semibold">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {changes.map((c) => (
                          <tr key={c.key} className="align-top">
                            <td className="py-1.5 pr-3 font-medium text-ink-2">
                              {c.key}
                            </td>
                            <td className="py-1.5 pr-3 text-ink-3 line-through wrap-anywhere">
                              {c.before}
                            </td>
                            <td className="py-1.5 font-medium text-ink wrap-anywhere">
                              {c.after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {changes.length === 0 && (
                    <p className="mt-2 text-ink-3 text-xs">
                      No field-level detail was recorded for this action.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="font-semibold text-ink-4 text-2xs uppercase tracking-wide sm:pt-0.5">
        {label}
      </dt>
      <dd className="mb-1 text-ink-2 sm:mb-0">{children}</dd>
    </>
  );
}

/** `order.address.update` → `Order address update`. */
function describe(action: string) {
  const words = action.split(".").join(" ").replace(/[-_]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function when(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function show(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "none";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "empty";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Only the keys that actually differ. Most actions record a handful of fields
 * and change one of them; listing the other six as "unchanged" buries the one
 * that matters.
 */
function diff(before: unknown, after: unknown) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  if (typeof b !== "object" || typeof a !== "object") return [];

  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];

  return keys
    .map((key) => ({
      key,
      before: show(b[key]),
      after: show(a[key]),
    }))
    .filter((c) => c.before !== c.after);
}
