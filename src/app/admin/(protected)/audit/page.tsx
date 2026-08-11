import { ScrollText, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import {
  AUDIT_AREAS,
  getAuditActors,
  listAuditLog,
} from "@/server/services/admin/audit";
import { AuditTable } from "./audit-table";

export const instant = false;

export const metadata: Metadata = { title: "Activity log" };

const DATE_RANGES = [
  { label: "All time", days: undefined },
  { label: "Today", days: "1" },
  { label: "7 days", days: "7" },
  { label: "30 days", days: "30" },
] as const;

export default async function AuditPage(props: PageProps<"/admin/audit">) {
  await connection();

  // Only the owner holds `audit: ["read"]`. A manager who can change a price
  // should not also be the one who decides whether that change is visible.
  await requirePermission({ audit: ["read"] });

  const sp = await props.searchParams;
  const area = typeof sp.area === "string" ? sp.area : undefined;
  const userId = typeof sp.user === "string" ? sp.user : undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const days = Number(sp.days) || undefined;
  const page = Number(sp.page) || 1;

  const [{ rows, total, pageCount }, actors] = await Promise.all([
    listAuditLog({ area, userId, q, days, page }),
    getAuditActors(),
  ]);

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      area,
      user: userId,
      q,
      days: days ? String(days) : undefined,
      ...next,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Activity log"
        subtitle={
          total === 0
            ? "Every admin change is recorded here."
            : `${total.toLocaleString("en-GB")} recorded ${total === 1 ? "change" : "changes"}`
        }
      />

      {/* Filters are links rather than client state: a filtered view stays
          shareable, which is the point when you are asking a colleague to
          look at the same twenty rows you are. */}
      <form
        method="get"
        className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-3"
      >
        {area && <input type="hidden" name="area" value={area} />}
        {userId && <input type="hidden" name="user" value={userId} />}
        {days && <input type="hidden" name="days" value={String(days)} />}
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-ink-4"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by action or record id"
            aria-label="Search the activity log"
            className="h-10 w-full rounded-btn border border-line bg-surface pl-9 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </form>

      <div className="mb-4 space-y-2">
        <Row label="Area">
          <Chip href={href({ area: undefined, page: undefined })} on={!area}>
            Everything
          </Chip>
          {AUDIT_AREAS.map((a) => (
            <Chip
              key={a.value}
              href={href({ area: a.value, page: undefined })}
              on={area === a.value}
            >
              {a.label}
            </Chip>
          ))}
        </Row>

        {actors.length > 1 && (
          <Row label="Who">
            <Chip
              href={href({ user: undefined, page: undefined })}
              on={!userId}
            >
              Anyone
            </Chip>
            {actors.map((a) => (
              <Chip
                key={a.id}
                href={href({ user: a.id, page: undefined })}
                on={userId === a.id}
              >
                {a.name || a.email}
              </Chip>
            ))}
          </Row>
        )}

        <Row label="When">
          {DATE_RANGES.map((r) => (
            <Chip
              key={r.label}
              href={href({ days: r.days, page: undefined })}
              on={r.days ? days === Number(r.days) : days === undefined}
            >
              {r.label}
            </Chip>
          ))}
        </Row>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded"
          body={
            area || userId || q || days
              ? "No changes match those filters. Try widening the date range."
              : "Admin changes will appear here as they happen — who did what, and what the record looked like before and after."
          }
        />
      ) : (
        <AuditTable rows={rows} />
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <p className="text-ink-3 text-sm tnum">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href({ page: String(page - 1) })}
                className="rounded-btn border border-line px-3 py-2 font-semibold text-ink-2 text-sm tap hover:bg-surface-2"
              >
                Newer
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={href({ page: String(page + 1) })}
                className="rounded-btn border border-line px-3 py-2 font-semibold text-ink-2 text-sm tap hover:bg-surface-2"
              >
                Older
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 shrink-0 font-semibold text-2xs text-ink-4 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  href,
  on,
  children,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={cn(
        "rounded-chip px-2.5 py-1 font-medium text-xs tap transition-colors",
        on
          ? "bg-brand-soft font-semibold text-brand-on"
          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
