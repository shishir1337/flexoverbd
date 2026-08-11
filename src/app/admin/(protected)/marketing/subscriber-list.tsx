"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import type { SubscriberStats } from "@/server/services/admin/marketing";
import { exportSubscribers } from "@/server/services/admin/marketing-actions";

/**
 * Newsletter subscribers.
 *
 * Only the twenty most recent are listed — nobody scrolls a mailing list, they
 * export it. The export is generated on demand rather than rendered into the
 * page so the addresses of every subscriber are not sitting in the HTML of a
 * screen someone might have open on a shared laptop.
 */
export function SubscriberList({ stats }: { stats: SubscriberStats }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const emails = await exportSubscribers();
      const csv = ["email", ...emails].join("\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "flexover-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-extrabold text-ink">Newsletter</h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            {stats.subscribed} subscribed
            {stats.total !== stats.subscribed &&
              ` · ${stats.total - stats.subscribed} unsubscribed`}
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={busy || stats.subscribed === 0}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-btn border border-line px-3 font-semibold text-ink-2 text-sm tap hover:border-brand-500 disabled:opacity-40"
        >
          <Download aria-hidden className="size-4" />
          {busy ? "Preparing…" : "Export CSV"}
        </button>
      </div>

      {stats.recent.length === 0 ? (
        <p className="mt-4 text-center text-ink-3 text-sm">
          Nobody has signed up yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {stats.recent.map((s) => (
            <li
              key={s.email}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 truncate text-ink-2 text-sm">
                {s.email}
              </span>
              <span className="shrink-0 text-2xs text-ink-3 tnum">
                {s.createdAt}
                {s.source ? ` · ${s.source}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
