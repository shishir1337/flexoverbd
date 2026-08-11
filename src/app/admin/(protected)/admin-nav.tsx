"use client";

import {
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Percent,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Admin navigation.
 *
 * Desktop-first — the storefront's mobile budget does not apply here — but it
 * collapses to a scrollable strip on a phone rather than disappearing, because
 * staff do update order status on the move.
 *
 * Grouped rather than a flat list: nine unlabelled entries made "where do I
 * change the delivery fee" a scan of every item. The sections match how the
 * work actually divides — the daily queue, the catalogue, the shopfront, and
 * the things you set once.
 *
 * Items are shown to everyone who can reach /admin; the *pages* enforce
 * per-role permissions. Staff is the one exception, because an owner-only page
 * offered to a staff member is a dead end rather than a nicety.
 */

type Item = {
  href: string;
  label: string;
  icon: typeof Package;
  exact?: boolean;
  /** Which count from `badges` to show, when it is non-zero. */
  badge?: "orders" | "reviews";
  /** Hidden unless the signed-in user is an owner. */
  ownerOnly?: boolean;
};

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Today",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBag,
        badge: "orders",
      },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Tag },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    title: "Shopfront",
    items: [
      { href: "/admin/content", label: "Content", icon: FileText },
      {
        href: "/admin/content/reviews",
        label: "Reviews",
        icon: Store,
        badge: "reviews",
      },
      { href: "/admin/marketing", label: "Marketing", icon: Percent },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/staff", label: "Staff", icon: Shield, ownerOnly: true },
      {
        href: "/admin/audit",
        label: "Activity log",
        icon: ScrollText,
        ownerOnly: true,
      },
    ],
  },
];

export type NavBadges = { orders: number; reviews: number };

export function AdminNav({
  user,
  badges,
}: {
  user: { name: string; email: string; role: string };
  /** Live counts, fetched by the layout. */
  badges?: NavBadges;
}) {
  const pathname = usePathname();

  /**
   * `startsWith` alone would light up Content while you are on
   * Content → Reviews, which is its own entry. Anything with a longer sibling
   * in the nav has to match exactly instead.
   */
  const isActive = (item: Item) => {
    if (item.exact) return pathname === item.href;
    const hasLongerSibling = GROUPS.some((g) =>
      g.items.some((i) => i !== item && i.href.startsWith(`${item.href}/`)),
    );
    return hasLongerSibling
      ? pathname === item.href
      : pathname.startsWith(item.href);
  };

  return (
    <nav
      aria-label="Admin"
      className="flex shrink-0 flex-col border-line border-b bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:self-start lg:border-r lg:border-b-0"
    >
      <div className="flex items-center gap-2 border-line border-b px-4 py-3.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-btn bg-brand-500 font-extrabold text-sm text-white">
          F
        </span>
        <span className="min-w-0">
          <span className="block truncate font-extrabold text-ink text-sm">
            FlexOver BD
          </span>
          <span className="block text-2xs text-ink-3 capitalize">
            {user.role}
          </span>
        </span>
      </div>

      {/* One scrollable strip on a phone, sectioned column from lg up. The
          group headings are hidden on mobile — they would double the height of
          a bar that has to stay out of the way. */}
      <div className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-y-auto">
        {GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.ownerOnly || user.role === "owner",
          );
          if (items.length === 0) return null;

          return (
            <div key={group.title} className="contents lg:block lg:pb-2">
              <p className="hidden px-3 pt-3 pb-1 font-semibold text-2xs text-ink-4 uppercase tracking-wide lg:block">
                {group.title}
              </p>
              <ul className="contents lg:block lg:space-y-0.5">
                {items.map((item) => {
                  const { href, label, icon: Icon } = item;
                  const active = isActive(item);
                  const count = item.badge ? (badges?.[item.badge] ?? 0) : 0;

                  return (
                    <li key={href} className="shrink-0 lg:shrink">
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-btn px-3 font-medium text-sm tap transition-colors",
                          active
                            ? "bg-brand-soft text-brand-on"
                            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <Icon aria-hidden className="size-4.5 shrink-0" />
                        <span className="lg:flex-1">{label}</span>
                        {count > 0 && (
                          <span className="ml-1 grid min-w-5 shrink-0 place-items-center rounded-full bg-danger px-1.5 py-0.5 font-bold text-2xs text-white tnum">
                            <span aria-hidden>
                              {count > 99 ? "99+" : count}
                            </span>
                            {/* A bare "3" beside "Orders" is ambiguous read
                                aloud, so the meaning is spelled out for screen
                                readers and hidden from sighted users. */}
                            <span className="sr-only">
                              {count} need attention
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
