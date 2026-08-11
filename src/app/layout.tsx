import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { getSiteSettings } from "@/server/services/settings";
import "./globals.css";

/**
 * Root layout: document shell only.
 *
 * Storefront chrome — header, footer, bottom nav, cart — lives in
 * `(storefront)/layout.tsx` instead. It used to be here, which meant /admin
 * rendered a shopping cart and a bottom nav for staff, and the storefront's
 * `usePathname()` reads broke the admin's static shell under Cache Components.
 *
 * Two variable families, both self-hosted and subset by next/font, so there is
 * no render-blocking request to Google and no FOIT. Inter carries the UI and
 * all pricing (excellent tabular figures); Jakarta only styles headings.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

/**
 * Metadata is generated rather than a constant because the store name, tagline
 * and canonical URL are admin-editable — a static export would freeze whatever
 * was in the database at build time.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} — ${site.shortDescription}`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    keywords: [
      "online shopping bangladesh",
      "flexover bd",
      "fashion bangladesh",
      "gadgets bd",
      "home essentials bd",
      "beauty products bangladesh",
      "cash on delivery bd",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      url: site.url,
      title: `${site.name} — ${site.shortDescription}`,
      description: site.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${site.shortDescription}`,
      description: site.description,
    },
    icons: {
      icon: [{ url: "/icon.jpg", type: "image/jpeg" }],
      apple: [{ url: "/icon.jpg" }],
    },
    // No `robots` here on purpose. Indexing is the default, so declaring it
    // buys nothing — and on a not-found page Next injects its own
    // `noindex`, leaving two contradictory robots tags in the same document
    // for a crawler to pick between. /admin sets its own noindex.
    formatDetection: { telephone: true, address: false, email: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale / userScalable — pinch zoom must stay available.
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-BD"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">
        {children}
      </body>
    </html>
  );
}
