import { Suspense } from "react";
import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToast } from "@/components/cart/cart-toast";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { MetaPixel } from "@/components/meta-pixel";
import { SettingsProvider } from "@/components/settings-provider";
import { WishlistProvider } from "@/components/wishlist/wishlist-context";
import { getStorefrontSettings } from "@/server/services/settings";
import { getMetaPixelId } from "@/server/services/tracking-settings";

/**
 * Storefront chrome.
 *
 * Split out of the root layout so it wraps shopping routes only. /admin sits
 * outside this group and gets its own shell — staff working an order queue have
 * no use for a cart drawer, a wishlist provider or a WhatsApp button, and
 * shipping them was both a design mistake and dead JavaScript on every admin
 * page load.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetched once here and handed to Client Components through context — they
  // cannot query, and duplicating the values as constants is how the checkout
  // preview and the server's actual charge drift apart.
  const [settings, metaPixelId] = await Promise.all([
    getStorefrontSettings(),
    getMetaPixelId(),
  ]);

  return (
    <SettingsProvider value={settings}>
      {/* Loads afterInteractive and fires PageView. Renders nothing when the
          pixel id is unset, so an unconfigured shop ships no tracking at all. */}
      <MetaPixel pixelId={metaPixelId ?? undefined} />
      <a
        href="#main"
        className="sr-only rounded-btn bg-scrim px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
      >
        Skip to main content
      </a>

      <CartProvider>
        <WishlistProvider>
          <SiteHeader />

          <main id="main" className="flex-1">
            {children}
          </main>

          <SiteFooter />

          {/*
            BottomNav and MobileMenu read usePathname() to mark the current
            route. That is dynamic URL data, so under Cache Components it has
            to sit behind a boundary or the static shell cannot be generated.
            No fallback: the bar is fixed-position chrome, and reserving space
            for it would shift the page.
          */}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>

          <WhatsAppFab />
          <CartDrawer />
          <CartToast />
        </WishlistProvider>
      </CartProvider>
    </SettingsProvider>
  );
}
