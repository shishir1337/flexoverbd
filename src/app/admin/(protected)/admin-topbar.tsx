"use client";

import { ChevronRight, ExternalLink, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCrumbLabel } from "@/components/admin/crumb";
import { AdminButton } from "@/components/admin/ui";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import type { NotificationFeed } from "@/server/services/admin/notifications";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";

/**
 * Where each admin path sits, for the breadcrumb.
 *
 * Derived from the URL rather than passed down from each page: a page that has
 * to remember to declare its own breadcrumb is a page that will eventually
 * forget, and the URL already knows.
 */
const LABELS: Record<string, string> = {
  admin: "Dashboard",
  orders: "Orders",
  products: "Products",
  categories: "Categories",
  customers: "Customers",
  marketing: "Marketing",
  content: "Content",
  media: "Media",
  settings: "Settings",
  staff: "Staff",
  audit: "Activity log",
  banners: "Banners",
  screenshots: "Screenshots",
  reviews: "Reviews",
  slips: "Packing slips",
  new: "New",
};

/**
 * Opaque record ids (cuids) become an ellipsis; anything human — an order
 * number like `FB-260805-1894`, a slug — is shown as itself. The test is
 * deliberately loose: a false positive costs one ellipsis for a moment, a
 * false negative puts twenty-five characters of noise in the header.
 */
function readable(segment: string) {
  const value = decodeURIComponent(segment);
  return /^c[a-z0-9]{20,}$/i.test(value) || /^[0-9a-f-]{36}$/i.test(value)
    ? "…"
    : value;
}

/**
 * The admin header.
 *
 * Until now the sidebar was the only chrome, which left nowhere for the
 * signed-in user, no route back to the storefront, and — the reason this got
 * built — nowhere for alerts to appear. Staff working the order queue had to
 * refresh a list to discover an order had arrived.
 *
 * Sticky, because it holds the notification bell: an alert that scrolls out of
 * view is not an alert.
 */
export function AdminTopbar({
  user,
  notifications,
}: {
  user: { name: string; email: string; role: string };
  notifications: NotificationFeed;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  // The page publishes the record's name; until it does (the shell streams
  // first) an opaque id shows as an ellipsis rather than a wall of cuid.
  const published = useCrumbLabel();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, i) => {
    const last = i === segments.length - 1;
    const known = LABELS[segment];
    return {
      label: last
        ? (published ?? known ?? readable(segment))
        : (known ?? readable(segment)),
      href: `/${segments.slice(0, i + 1).join("/")}`,
      last,
    };
  });

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-line border-b bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      {/* On a phone the full trail competes with the search box for a row that
          is already tight, so only the current page shows. It still earns its
          place: the h1 below scrolls away and this bar does not. */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb) => (
            <li
              key={crumb.href}
              className={cn(
                "min-w-0 items-center gap-1",
                crumb.last ? "flex" : "hidden sm:flex",
              )}
            >
              {crumb.href !== "/admin" && (
                <ChevronRight
                  aria-hidden
                  className="hidden size-3.5 shrink-0 text-ink-4 sm:block"
                />
              )}
              {crumb.last ? (
                <span
                  aria-current="page"
                  className="truncate font-semibold text-ink"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-ink-3 tap hover:text-ink"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <GlobalSearch />

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden items-center gap-1.5 rounded-btn px-2.5 py-1.5 font-medium text-ink-3 text-sm tap transition-colors hover:bg-surface-2 hover:text-ink sm:inline-flex"
      >
        <ExternalLink aria-hidden className="size-3.5" />
        View shop
      </a>

      <NotificationBell initial={notifications} />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Account menu for ${user.name}`}
          className={cn(
            "grid size-9 place-items-center rounded-full bg-brand-soft font-bold text-2xs text-brand-on tap transition-colors",
            menuOpen && "ring-2 ring-brand-400",
          )}
        >
          {initials || <User aria-hidden className="size-4" />}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-100 mt-2 w-56 overflow-hidden rounded-card border border-line bg-surface shadow-pop motion-safe:animate-[toast-in_140ms_ease-out]"
          >
            <div className="border-line border-b px-3.5 py-3">
              <p className="truncate font-bold text-ink text-sm">{user.name}</p>
              <p className="truncate text-2xs text-ink-3">{user.email}</p>
              <p className="mt-1 inline-flex rounded-chip bg-surface-2 px-1.5 py-0.5 font-semibold text-2xs text-ink-3 capitalize">
                {user.role}
              </p>
            </div>
            <div className="p-1.5">
              <AdminButton
                variant="ghost"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
