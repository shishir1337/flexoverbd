import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/guards";
import { safeRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a FlexOver BD account to keep your order history and delivery address. Ordering never requires one.",
  robots: { index: false, follow: false },
};

/**
 * Reading the session and `?next=` is per-request, so it sits behind its own
 * boundary and the heading above it still prerenders.
 */
async function Form({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const next = typeof params.next === "string" ? params.next : undefined;

  if (session) redirect(safeRedirect(next));

  return <AuthForm mode="signup" next={next} />;
}

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Create account" }]}
      />

      <div className="mx-auto max-w-sm">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft">
            <UserPlus aria-hidden className="size-7 text-brand-600" />
          </span>
          <h1 className="mt-3 font-extrabold text-2xl text-ink sm:text-3xl">
            Create an account
          </h1>
          <p className="mt-1.5 text-ink-2 text-sm">
            Keeps your orders and address in one place. You can always check out
            as a guest instead.
          </p>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <Suspense fallback={<Skeleton className="h-96 rounded-btn" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
