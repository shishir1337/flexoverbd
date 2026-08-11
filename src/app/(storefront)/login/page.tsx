import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/account/auth-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/guards";
import { safeRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to see your FlexOver BD order history and saved delivery address. Ordering never requires an account.",
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

  // Already signed in? The form would just be a dead end.
  if (session) redirect(safeRedirect(next));

  return (
    <>
      {params.reset === "1" && (
        <p className="mb-4 rounded-btn bg-success-soft px-3 py-2.5 font-medium text-success text-sm">
          Password updated. Sign in with your new one.
        </p>
      )}
      <AuthForm mode="signin" next={next} />
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[{ label: "Home", href: "/" }, { label: "Sign in" }]}
      />

      <div className="mx-auto max-w-sm">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft">
            <LogIn aria-hidden className="size-7 text-brand-600" />
          </span>
          <h1 className="mt-3 font-extrabold text-2xl text-ink sm:text-3xl">
            Sign in
          </h1>
          <p className="mt-1.5 text-ink-2 text-sm">
            For your order history and saved address. You never need an account
            to buy something.
          </p>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <Suspense fallback={<Skeleton className="h-80 rounded-btn" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
