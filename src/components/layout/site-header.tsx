import { ArrowRight, ChevronDown, Heart, Phone, User } from "lucide-react";
import Link from "next/link";
import { CartButton } from "@/components/cart/cart-button";
import { cn } from "@/lib/utils";
import { getAllCategories } from "@/server/services/categories";
import { getNavLinks } from "@/server/services/content";
import {
  getContactSettings,
  getTrendingSearches,
} from "@/server/services/settings";
import { AnnouncementBar } from "./announcement-bar";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

/**
 * Mobile keeps a single 56px row — menu, mark, search, cart — because search is
 * the highest-intent action on a catalogue this wide and burning a second
 * sticky row on nav would cost ~7% of a phone viewport. The menu button opens
 * the only route to subcategories and the help pages on a phone; the bottom bar
 * and the on-page scroller cover the top-level destinations.
 */
export async function SiteHeader() {
  const [contact, categories, trendingSearches, shortcuts, helpLinks] =
    await Promise.all([
      getContactSettings(),
      getAllCategories(),
      getTrendingSearches(),
      getNavLinks("MOBILE_SHORTCUT"),
      getNavLinks("MOBILE_HELP"),
    ]);

  return (
    <>
      <AnnouncementBar />

      <header
        className="sticky top-0 border-b border-line bg-surface/95 backdrop-blur-md"
        style={{ zIndex: "var(--z-header)" }}
      >
        <div className="container-page">
          <div className="flex h-14 items-center gap-1.5 lg:h-20 lg:gap-6">
            <MobileMenu
              categories={categories}
              shortcuts={shortcuts}
              helpLinks={helpLinks}
            />

            <Logo showWordmark={false} markSize={36} className="lg:hidden" />
            <Logo showWordmark markSize={48} className="hidden lg:flex" />

            <HeaderSearch
              className="min-w-0 flex-1 lg:max-w-2xl"
              trendingSearches={trendingSearches}
            />

            <div className="ml-auto flex items-center gap-0.5 lg:gap-1">
              <a
                href={contact.phoneHref}
                className="hidden items-center gap-2 rounded-btn px-3 py-2 text-sm text-ink-2 tap hover:bg-surface-2 hover:text-ink xl:flex"
              >
                <Phone aria-hidden className="size-5 text-brand-600" />
                <span className="leading-tight">
                  <span className="block text-2xs text-ink-3">
                    Order by phone
                  </span>
                  <span className="block font-semibold text-ink tnum">
                    {contact.phoneDisplay}
                  </span>
                </span>
              </a>

              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="hidden size-11 place-items-center rounded-full text-ink tap hover:bg-surface-2 lg:grid"
              >
                <Heart aria-hidden className="size-5.5" strokeWidth={1.9} />
              </Link>

              <Link
                href="/account"
                aria-label="Your account"
                className="hidden size-11 place-items-center rounded-full text-ink tap hover:bg-surface-2 lg:grid"
              >
                <User aria-hidden className="size-5.5" strokeWidth={1.9} />
              </Link>

              <CartButton />
            </div>
          </div>
        </div>

        {/* Desktop category bar. Hidden on mobile — the bottom nav and the
            on-page category scroller cover the same ground with fewer taps. */}
        <nav
          aria-label="Categories"
          className="hidden border-t border-line lg:block"
        >
          <div className="container-page">
            <ul className="flex items-center gap-1">
              {categories.map((c) => (
                // `group` + hover/focus-within drives the dropdown, so the
                // whole nav stays a Server Component with no JavaScript. It is
                // a list of links, not a menu widget — tabbing into it opens
                // the panel and tabbing out closes it, which is the behaviour
                // a keyboard user expects here.
                <li key={c.slug} className="group relative">
                  <Link
                    href={`/category/${c.slug}`}
                    className="flex items-center gap-1 rounded-btn px-3 py-2.5 text-sm font-medium text-ink-2 tap transition-colors group-hover:bg-brand-soft group-hover:text-brand-on group-focus-within:bg-brand-soft group-focus-within:text-brand-on"
                  >
                    {c.name}
                    <ChevronDown
                      aria-hidden
                      className="size-3.5 text-ink-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                    />
                  </Link>

                  <div
                    className={cn(
                      "invisible absolute top-full left-0 z-10 w-56 -translate-y-1 rounded-card border border-line bg-surface p-1.5 opacity-0 shadow-pop",
                      "transition-[opacity,transform,visibility] duration-200 ease-(--ease-out-soft)",
                      "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                      "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
                    )}
                  >
                    <ul>
                      {c.subcategories.map((sub) => (
                        <li key={sub.slug}>
                          <Link
                            href={`/category/${c.slug}/${sub.slug}`}
                            className="block rounded-btn px-3 py-2 text-sm text-ink-2 tap transition-colors hover:bg-surface-2 hover:text-brand-on"
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/category/${c.slug}`}
                      className="mt-1 flex items-center gap-1 border-t border-line px-3 pt-2 pb-1 text-xs font-bold text-brand-on tap hover:text-brand-300"
                    >
                      All {c.name}
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
              <li className="ml-auto">
                <Link
                  href="/offers"
                  className="flex items-center gap-1.5 rounded-btn px-3 py-2.5 text-sm font-bold text-danger tap hover:bg-danger-soft"
                >
                  Today&apos;s Offers
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>
    </>
  );
}
