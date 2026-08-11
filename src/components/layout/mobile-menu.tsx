"use client";

import {
  ChevronDown,
  Heart,
  Menu,
  Package,
  Phone,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useContactInfo } from "@/components/settings-provider";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import type { Category } from "@/data/types";
import { icon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { NavEntry } from "@/server/services/content";

const ACCOUNT = [
  { href: "/account", label: "My Account", icon: User },
  { href: "/track-order", label: "Track Order", icon: Package },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
] as const;

/**
 * Mobile menu.
 *
 * The bottom nav covers the five top-level destinations, but subcategories and
 * the help pages had no route in on a phone at all — this drawer is the only
 * place they are reachable. Categories expand in place rather than pushing a
 * second panel, so nothing is ever more than two taps deep and there is no
 * back-stack to get lost in.
 */
export function MobileMenu({
  categories,
  shortcuts,
  helpLinks,
}: {
  categories: Category[];
  // Passed down rather than fetched: this is a Client Component, and the
  // header already has a server context to read them in.
  shortcuts: NavEntry[];
  helpLinks: NavEntry[];
}) {
  const contact = useContactInfo();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // The drawer is portalled to <body>, which only exists on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Any navigation closes the drawer. Without this, tapping a link on the
  // route you are already on would leave the drawer sitting open over it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value this effect reads
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap: the drawer is a modal, so Tab must cycle inside it.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    // Lock the page behind the drawer, or scrolling the menu scrolls the feed.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink tap hover:bg-surface-2 lg:hidden"
      >
        <Menu aria-hidden className="size-6" strokeWidth={1.9} />
      </button>

      {/*
        Portalled to <body> — and it has to be. This component renders inside
        <header>, which carries `backdrop-blur`. A backdrop-filter makes that
        element the containing block for `position: fixed` descendants, so
        `inset-y-0` resolved against the header's 56px box and the drawer came
        out 317x56, tucked under the page. The header's own z-index also traps
        any child in its stacking context, so the panel painted beneath the
        page content regardless of its z-index.
      */}
      {mounted &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              aria-hidden
              className={cn(
                "fixed inset-0 bg-scrim/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
                open ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ zIndex: "var(--z-scrim)" }}
            />

            <div
              ref={panelRef}
              role="dialog"
              aria-modal={open}
              aria-label="Menu"
              inert={!open}
              className={cn(
                "fixed inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-surface shadow-pop lg:hidden",
                "transition-transform duration-300 ease-(--ease-out-soft)",
                open ? "translate-x-0" : "-translate-x-full",
              )}
              style={{ zIndex: "var(--z-drawer)" }}
            >
              <header className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
                <span className="text-base font-extrabold text-ink">Menu</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-11 place-items-center rounded-full text-ink-2 tap hover:bg-surface-2 hover:text-ink"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
                <Section title="Shop by category">
                  <ul>
                    {categories.map((c) => {
                      const isOpen = expanded === c.slug;
                      return (
                        <li key={c.slug}>
                          <div className="flex items-center">
                            <Link
                              href={`/category/${c.slug}`}
                              className="flex min-h-11 flex-1 items-center px-4 text-[0.9375rem] font-medium text-ink tap hover:bg-surface-2"
                            >
                              {c.name}
                            </Link>
                            {c.subcategories.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded(isOpen ? null : c.slug)
                                }
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? "Hide" : "Show"} ${c.name} subcategories`}
                                className="mr-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-3 tap hover:bg-surface-2"
                              >
                                <ChevronDown
                                  aria-hidden
                                  className={cn(
                                    "size-4.5 transition-transform duration-200",
                                    isOpen && "rotate-180",
                                  )}
                                />
                              </button>
                            )}
                          </div>

                          {isOpen && (
                            <ul className="animate-fade-up border-l-2 border-brand-100 bg-surface-2/60 py-1 pl-2">
                              {c.subcategories.map((sub) => (
                                <li key={sub.slug}>
                                  <Link
                                    href={`/category/${c.slug}/${sub.slug}`}
                                    className="flex min-h-11 items-center px-4 text-sm text-ink-2 tap hover:text-brand-on"
                                  >
                                    {sub.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Section>

                <Section title="Discover">
                  <IconList
                    items={shortcuts.map((l) => ({
                      href: l.href,
                      label: l.label,
                      icon: icon(l.icon),
                    }))}
                  />
                </Section>

                <Section title="Your account">
                  <IconList items={ACCOUNT} />
                </Section>

                <Section title="Help">
                  <ul className="flex flex-wrap gap-x-1 gap-y-1 px-2 pb-2">
                    {helpLinks.map((l) => (
                      <li key={l.id}>
                        <Link
                          href={l.href}
                          className="flex min-h-11 items-center rounded-btn px-2 text-sm text-ink-2 tap hover:bg-surface-2 hover:text-brand-on"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>

                <div className="border-t border-line p-4">
                  <a
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 items-center justify-center gap-2.5 rounded-btn border border-[#25D366] bg-[#25D366]/10 text-sm font-bold text-[#128C4A] tap"
                  >
                    <WhatsAppIcon className="size-5 text-[#25D366]" />
                    Order on WhatsApp
                  </a>
                  <a
                    href={contact.phoneHref}
                    className="mt-2 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-ink-2 tap"
                  >
                    <Phone aria-hidden className="size-4 text-brand-600" />
                    <span className="tnum">{contact.phoneDisplay}</span>
                  </a>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-2">
      <h2 className="px-4 pt-2 pb-1 text-2xs font-bold tracking-wide text-ink-3 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function IconList({
  items,
}: {
  items: readonly {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <ul>
      {items.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex min-h-11 items-center gap-3 px-4 text-[0.9375rem] text-ink tap hover:bg-surface-2"
          >
            <Icon className="size-4.5 text-brand-600" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
