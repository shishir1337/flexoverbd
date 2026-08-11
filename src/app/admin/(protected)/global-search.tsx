"use client";

import {
  FolderTree,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { adminSearch, type SearchHit } from "@/server/services/admin/search";

const ICONS = {
  order: ShoppingBag,
  product: Package,
  customer: User,
  category: FolderTree,
} as const;

const GROUPS = [
  { kind: "order", label: "Orders" },
  { kind: "product", label: "Products" },
  { kind: "customer", label: "Customers" },
  { kind: "category", label: "Categories" },
] as const;

/**
 * Group headings, ordered by where each group's best hit ranks.
 *
 * The cursor indexes the *ranked* list, so a fixed group order would put the
 * highlight on the second row while the first row sat above it — searching a
 * customer's name highlighted the customer while the order rendered first, and
 * Enter went somewhere other than where the eye was.
 */
function orderedGroups(hits: SearchHit[]) {
  return [...GROUPS]
    .map((group) => ({
      group,
      best: hits.findIndex((h) => h.kind === group.kind),
    }))
    .filter((g) => g.best !== -1)
    .sort((a, b) => a.best - b.best)
    .map((g) => g.group);
}

/**
 * Search everything, from anywhere.
 *
 * Staff arrive knowing a thing — a customer on the phone, a package in hand —
 * not which screen holds it. This is the shortest path from "FB-260805-1894"
 * to that order.
 *
 * Fully keyboard-driven, because the person using it is usually mid-call:
 * ⌘K or Ctrl-K to open, type, arrows to move, Enter to go. The results list is
 * a listbox rather than a set of links so that Enter always means "the one
 * highlighted" and never "whatever the browser focused last".
 */
export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);

  // ⌘K / Ctrl-K from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setQuery("");
      setHits([]);
      setCursor(0);
      inputRef.current?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  /**
   * Debounced, and guarded against out-of-order responses: typing "FB-2" then
   * "FB-26" can land the slower first reply last, which would show results for
   * a query the box no longer contains.
   */
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    let stale = false;
    setLoading(true);

    const id = setTimeout(async () => {
      try {
        const results = await adminSearch(term);
        if (stale) return;
        setHits(results);
        setCursor(0);
      } finally {
        if (!stale) setLoading(false);
      }
    }, 200);

    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [query, open]);

  function go(hit: SearchHit) {
    setOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === "Enter" && hits[cursor]) {
      e.preventDefault();
      go(hits[cursor]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-btn border border-line px-2.5 text-ink-3 text-sm tap transition-colors hover:border-line-strong hover:text-ink sm:w-56"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-2xs sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard equivalent
          of the backdrop click is Escape, which <dialog> delivers through
          onCancel — the rule cannot see that. */}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          // Clicking the backdrop closes: unlike a confirm dialog, nothing here
          // is destructive and nothing is lost.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="mx-auto mt-[12vh] w-[min(38rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-scrim/50"
      >
        <div className="flex items-center gap-2.5 border-line border-b px-4">
          <Search aria-hidden className="size-4 shrink-0 text-ink-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Order number, product, SKU, customer name or phone"
            aria-label="Search the admin"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={hits.length > 0}
            aria-activedescendant={
              hits[cursor] ? `hit-${hits[cursor].id}` : undefined
            }
            className="h-13 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-4 focus:outline-none"
          />
          {loading && (
            <Loader2
              aria-hidden
              className="size-4 shrink-0 animate-spin text-ink-4"
            />
          )}
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="max-h-[min(28rem,60vh)] overflow-y-auto"
        >
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-ink-3 text-sm">
              Type at least two characters.
            </p>
          ) : hits.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-ink-3 text-sm">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            orderedGroups(hits).map((group) => {
              const rows = hits.filter((h) => h.kind === group.kind);
              if (rows.length === 0) return null;

              return (
                <section key={group.kind}>
                  <h2 className="px-4 pt-3 pb-1 font-semibold text-2xs text-ink-4 uppercase tracking-wide">
                    {group.label}
                  </h2>
                  <ul>
                    {rows.map((hit) => {
                      const index = hits.indexOf(hit);
                      const Icon = ICONS[hit.kind];
                      const on = index === cursor;

                      return (
                        <li key={hit.id}>
                          <button
                            type="button"
                            id={`hit-${hit.id}`}
                            role="option"
                            aria-selected={on}
                            onClick={() => go(hit)}
                            onMouseEnter={() => setCursor(index)}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-4 py-2 text-left tap transition-colors",
                              on ? "bg-brand-soft" : "hover:bg-surface-2",
                            )}
                          >
                            <Icon
                              aria-hidden
                              className={cn(
                                "size-4 shrink-0",
                                on ? "text-brand-on" : "text-ink-4",
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-ink text-sm">
                                {hit.title}
                              </span>
                              <span className="block truncate text-2xs text-ink-3">
                                {hit.detail}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-line border-t px-4 py-2 text-2xs text-ink-4">
          <span>
            <kbd className="font-sans">↑↓</kbd> move
          </span>
          <span>
            <kbd className="font-sans">↵</kbd> open
          </span>
          <span>
            <kbd className="font-sans">esc</kbd> close
          </span>
        </div>
      </dialog>
    </>
  );
}
