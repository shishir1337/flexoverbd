import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "@/components/account/account-view";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/guards";
import { findOrdersByPhone, toStorefrontOrder } from "@/server/services/orders";

export const metadata: Metadata = {
  title: "Your Account",
  description: "Your FlexOver BD orders, saved details and wishlist.",
  robots: { index: false, follow: false },
};

/**
 * Reading the session is per-request by definition, so it lives behind its own
 * boundary — the heading and breadcrumb above it are the same for everyone and
 * should paint immediately rather than waiting on a cookie lookup.
 */
async function Account() {
  // Orders are matched on the phone number, not the user id: almost every order
  // here is placed as a guest paying cash, so the phone is the only thing that
  // reliably links a person to their purchases.
  const session = await getSession();
  const phone = session?.user.phone ?? null;
  const rows = phone ? await findOrdersByPhone(phone) : [];
  const orders = rows.map(toStorefrontOrder);

  return (
    <AccountView
      orders={orders}
      signedIn={Boolean(session)}
      hasPhone={Boolean(phone)}
      name={session?.user.name}
      email={session?.user.email}
      phone={phone}
    />
  );
}

export default function AccountPage() {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Account" }]}
      />
      <h1 className="mb-5 text-2xl font-extrabold text-ink sm:text-3xl">
        Your account
      </h1>
      <Suspense fallback={<AccountSkeleton />}>
        <Account />
      </Suspense>
    </div>
  );
}

/** Matches the signed-out card's height so the swap does not shift the page. */
function AccountSkeleton() {
  return <Skeleton className="h-64 rounded-card" />;
}
