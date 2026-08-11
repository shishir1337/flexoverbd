"use client";

import {
  AlertCircle,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { adminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { AdminCategoryRow } from "@/server/services/admin/taxonomy";
import {
  reorderCategories,
  setCategoryArchived,
} from "@/server/services/admin/taxonomy-actions";

/**
 * Category list with ordering.
 *
 * Up/down buttons rather than drag-and-drop: this list is edited from a phone
 * as often as a desktop, and a drag target that competes with page scroll is
 * the single most frustrating control on a touch screen. The order is applied
 * optimistically and persisted on each move, so a dropped request shows up
 * immediately as the row snapping back.
 */
export function CategoryList({ initial }: { initial: AdminCategoryRow[] }) {
  const router = useRouter();
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Derived from props, with only the pending order held locally.
   *
   * `useState(initial)` ignores its initialiser after the first render, so a
   * category created elsewhere — or an archive toggle that `router.refresh()`
   * has already reflected on the server — would not show up here until a full
   * page reload. Anything absent from the pending order sorts last, which is
   * where a newly created category belongs.
   */
  const rows = useMemo(() => {
    if (!pendingOrder) return initial;
    const rank = new Map(pendingOrder.map((id, i) => [id, i]));
    return [...initial].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.POSITIVE_INFINITY) -
        (rank.get(b.id) ?? Number.POSITIVE_INFINITY),
    );
  }, [initial, pendingOrder]);

  const active = rows.filter((r) => !r.isArchived);
  const archived = rows.filter((r) => r.isArchived);

  function move(index: number, delta: number) {
    const next = [...active];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const ids = next.map((c) => c.id);
    setPendingOrder([...ids, ...archived.map((c) => c.id)]);
    setError(null);

    startTransition(async () => {
      const result = await reorderCategories({ ids });
      if (!result.ok) {
        setPendingOrder(null);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleArchive(row: AdminCategoryRow) {
    setError(null);
    startTransition(async () => {
      const result = await setCategoryArchived({
        id: row.id,
        archived: !row.isArchived,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {active.map((row, i) => (
          <li
            key={row.id}
            className="flex items-center gap-2 rounded-card border border-line bg-surface p-3"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || pending}
                aria-label={`Move ${row.name} up`}
                className="grid size-7 place-items-center rounded text-ink-3 tap hover:bg-surface-2 disabled:opacity-30"
              >
                <ArrowUp aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === active.length - 1 || pending}
                aria-label={`Move ${row.name} down`}
                className="grid size-7 place-items-center rounded text-ink-3 tap hover:bg-surface-2 disabled:opacity-30"
              >
                <ArrowDown aria-hidden className="size-4" />
              </button>
            </div>

            <Link
              href={`/admin/categories/${row.id}`}
              className="min-w-0 flex-1 tap"
            >
              <p className="truncate font-semibold text-ink text-sm">
                {row.name}
                {!row.isActive && (
                  <span className="ml-2 rounded-chip bg-surface-2 px-1.5 py-0.5 font-medium text-2xs text-ink-3">
                    Hidden
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-2xs text-ink-3">
                /{row.slug} · {row.productCount}{" "}
                {row.productCount === 1 ? "product" : "products"} ·{" "}
                {row.subcategoryCount} sub
              </p>
            </Link>

            <button
              type="button"
              onClick={() => toggleArchive(row)}
              disabled={pending}
              aria-label={`Archive ${row.name}`}
              className={adminButton(
                "ghost",
                "icon",
                "shrink-0 hover:bg-danger-soft hover:text-danger",
              )}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>

            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-4" />
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-ink-3 text-sm">Archived</h2>
          <ul className="mt-2 space-y-2">
            {archived.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-2 rounded-card border border-line border-dashed p-3",
                  "bg-surface-2",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-3 text-sm">
                    {row.name}
                  </p>
                  <p className="mt-0.5 truncate text-2xs text-ink-4">
                    /{row.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleArchive(row)}
                  disabled={pending}
                  className={adminButton("secondary", "sm", "shrink-0")}
                >
                  <ArchiveRestore aria-hidden className="size-4" />
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
