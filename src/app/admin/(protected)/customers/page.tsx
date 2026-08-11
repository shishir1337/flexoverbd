import { Search, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { adminButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/guards";
import { cn, formatBDT } from "@/lib/utils";
import {
  type CustomerFilters,
  listCustomers,
} from "@/server/services/admin/customers";

export const instant = false;
export const metadata: Metadata = { title: "Customers" };

const SORTS = [
  { key: "recent", label: "Recent" },
  { key: "value", label: "Top spenders" },
  { key: "orders", label: "Most orders" },
] as const;

/**
 * Customers, one row per mobile number.
 *
 * See `services/admin/customers.ts` for why phone and not user account. The
 * cancellation count is given its own column rather than buried in a detail
 * page: on cash on delivery it is the number that decides whether to phone
 * ahead before dispatching, and it is only useful if it is visible in the list.
 */
export default async function AdminCustomersPage(
  props: PageProps<"/admin/customers">,
) {
  await connection();
  await requirePermission({ customer: ["read"] });

  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const sort =
    sp.sort === "value" || sp.sort === "orders"
      ? (sp.sort as CustomerFilters["sort"])
      : "recent";
  const page = Number(sp.page) || 1;

  const { customers, total, pageCount } = await listCustomers({
    q,
    sort,
    page,
  });

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, sort, ...next })) {
      if (v && v !== "recent") params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Customers"
        subtitle={`${total} ${
          total === 1 ? "customer" : "customers"
        }, matched by mobile number — guest orders included.`}
      />

      <form method="get" className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-ink-4"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, mobile number or email"
            aria-label="Search customers"
            className="h-10 w-full rounded-btn border border-line bg-surface pl-9 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          />
        </div>
        {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
        <button
          type="submit"
          className={adminButton("secondary", "md", "shrink-0")}
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={href({ sort: s.key, page: undefined })}
            className={cn(
              "rounded-chip border px-3 py-1.5 font-semibold text-sm tap",
              sort === s.key
                ? "border-brand-500 bg-brand-soft text-brand-on"
                : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {customers.length === 0 ? (
        <p className="mt-6 rounded-card border border-line border-dashed bg-surface p-8 text-center text-ink-3 text-sm">
          {q ? "No customer matches that." : "No orders yet."}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {customers.map((c) => (
            <li key={c.phone}>
              <Link
                href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 tap hover:border-brand-500"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
                  <UserRound aria-hidden className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink text-sm">
                    {c.name}
                    {c.hasAccount && (
                      <span className="ml-2 rounded-chip bg-brand-soft px-1.5 py-0.5 font-medium text-2xs text-brand-on">
                        Account
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-2xs text-ink-3 tnum">
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ""}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-bold text-ink text-sm tnum">
                    {formatBDT(c.lifetimeValue)}
                  </span>
                  <span className="block text-2xs text-ink-3">
                    {c.deliveredCount}/{c.orderCount} delivered
                    {c.cancelledCount > 0 && (
                      <span className="ml-1 font-semibold text-danger">
                        · {c.cancelledCount} lost
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-5 flex items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              className="h-11 rounded-btn border border-line px-4 font-semibold text-ink-2 text-sm leading-[2.75rem] tap"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-3 text-sm tnum">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={href({ page: String(page + 1) })}
              className="h-11 rounded-btn border border-line px-4 font-semibold text-ink-2 text-sm leading-[2.75rem] tap"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
