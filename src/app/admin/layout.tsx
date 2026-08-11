import type { Metadata } from "next";

/**
 * Admin root.
 *
 * Deliberately holds no auth guard — /admin/login lives underneath it and must
 * stay reachable when signed out. The guard sits in `(protected)/layout.tsx`.
 *
 * The storefront's chrome (header, bottom nav, cart drawer) is absent by
 * design: this section renders its own shell, and a staff member updating an
 * order does not need a shopping cart.
 */
export const metadata: Metadata = {
  title: { default: "Admin · FlexOver BD", template: "%s · Admin" },
  // Belt and braces alongside the robots.txt disallow — an admin URL that
  // leaks into an index is an invitation to probe it.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-surface-2">{children}</div>;
}
