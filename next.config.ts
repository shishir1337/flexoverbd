import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Prisma's generated client and the pg driver must stay external — bundling
  // them breaks the engine/driver resolution at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  reactCompiler: true,

  experimental: {
    /**
     * Required for `forbidden()` and `unauthorized()` in `lib/auth/guards`.
     *
     * Without it every denial throws instead of interrupting, so a customer who
     * opens /admin — or a staff member who reaches a screen above their role —
     * gets a 500 crash rather than the app/forbidden.tsx page written for them.
     * The guards still fail closed either way; this is what makes the refusal
     * legible instead of looking like the admin is broken.
     */
    authInterrupts: true,
  },

  images: {
    /**
     * Uploaded media lives on ImageKit, and `next/image` refuses any remote
     * host it has not been told about — without this every uploaded photo
     * renders as a broken image the moment it reaches the storefront.
     *
     * Scoped to the CDN host rather than a wildcard: an open pattern turns our
     * image optimiser into a free proxy for the whole internet.
     */
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io", pathname: "/**" },
    ],
    // AVIF first: on the 4G connections most of our traffic arrives on, the
    // extra encode time is repaid several times over in transfer size.
    formats: ["image/avif", "image/webp"],
    // Next 16 restricts `quality` to this list; 65 is our default for
    // photography-heavy grids, 80 for hero artwork.
    qualities: [65, 75, 80],
    // Phone-first breakpoints. 384 covers a 2-up card on a 360px screen at
    // DPR 2; the large end covers the 21:9 desktop hero.
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [40, 64, 80, 96, 128, 200, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Payment marks are SVG. Next refuses to optimise SVG unless told to,
    // because a hostile SVG can carry script — so it is paired with the CSP
    // and download disposition Next documents for exactly this case. Every
    // SVG here is a file we committed to public/, never remote or user input.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // The homepage carries no user input, but the headers cost nothing and stop
  // the obvious classes of embedding/sniffing abuse.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
