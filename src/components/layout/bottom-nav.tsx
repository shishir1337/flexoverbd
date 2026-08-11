"use client";

import { Home, LayoutGrid, Percent, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";

/**
 * Five items is the Material ceiling and it is the right number here: Home,
 * Categories, Offers, Cart, Account covers every top-level destination without
 * an overflow menu. Cart opens the drawer rather than navigating, so the user
 * never loses their place in the feed.
 */
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/offers", label: "Offers", icon: Percent },
  { href: "cart", label: "Cart", icon: ShoppingCart },
  { href: "/account", label: "Account", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count, hydrated, openCart } = useCart();

  // Product pages pin their own buy bar to the bottom. Two fixed bars would
  // cost ~120px of a phone viewport on the page where the purchase decision
  // happens, so the nav stands down and the buy bar takes its place.
  if (pathname.startsWith("/product/")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 border-t border-brand-600 bg-brand-500 pb-safe lg:hidden"
      style={{ zIndex: "var(--z-bottomnav)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const isCart = href === "cart";
          const active = !isCart && pathname === href;
          const badge = isCart && hydrated && count > 0 ? count : 0;

          const content = (
            <>
              <span className="relative">
                <Icon
                  aria-hidden
                  className="size-5.5"
                  strokeWidth={active ? 2.3 : 1.8}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] leading-4 font-bold text-white tnum ring-2 ring-brand-500">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none">{label}</span>
              {/* Active indicator is a shape, not just a colour change — which
                  matters more here than it did on white, because the palette
                  available on an orange bar is narrow. */}
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 h-0.5 w-8 rounded-b-full bg-ink transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </>
          );

          /**
           * Ink on brand-500, and the depth of the orange is what decides it.
           *
           * The contrast flips partway down the ramp. On brand-500 (#ff8e02)
           * white is 2.30:1 and ink is 7.76:1, so ink wins. On brand-700
           * (#b35a00) it reverses — ink 3.76:1, white 4.75:1. These 10px labels
           * need 4.5:1, so the pairing is not a taste call: if the background
           * moves along the ramp, the text colour has to move with it.
           *
           * Both states use solid ink; active is distinguished by weight and
           * the indicator above it. Fading inactive items with opacity is the
           * obvious move and the wrong one — ink at 70 % over this orange
           * collapses to 2.56:1, worse than the white it replaced.
           */
          const classes = cn(
            "relative flex h-16 w-full flex-col items-center justify-center gap-1 tap",
            "text-ink transition-[font-weight] duration-200",
            active ? "font-bold" : "font-medium",
          );

          return (
            <li key={label}>
              {isCart ? (
                <button
                  type="button"
                  onClick={openCart}
                  className={classes}
                  aria-label={
                    badge > 0 ? `Open cart, ${badge} items` : "Open cart"
                  }
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={href}
                  className={classes}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
