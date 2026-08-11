import { KeyRound, LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

/**
 * The token is request data, so it sits behind its own boundary and the heading
 * above it still prerenders.
 *
 * Better Auth validates the token during its own redirect and sends people here
 * with either `?token=` or `?error=`, so a dead link is a normal arrival rather
 * than an exception — and it gets a way forward instead of a form that will
 * fail on submit.
 */
async function Form({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  if (!token) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2">
          <LinkIcon aria-hidden className="size-6 text-ink-4" />
        </span>
        <p className="mt-3 font-bold text-ink">This link has expired</p>
        <p className="mt-1 text-ink-2 text-sm">
          Reset links work once and last an hour. Ask for a fresh one and it
          will arrive in a moment.
        </p>
        <Link
          href="/forgot-password"
          className={buttonStyles("primary", "md", "mt-4")}
        >
          Send a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Home", href: "/" },
          { label: "Sign in", href: "/login" },
          { label: "New password" },
        ]}
      />

      <div className="mx-auto max-w-sm">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft">
            <KeyRound aria-hidden className="size-7 text-brand-600" />
          </span>
          <h1 className="mt-3 font-extrabold text-2xl text-ink sm:text-3xl">
            Set a new password
          </h1>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <Suspense fallback={<Skeleton className="h-64 rounded-btn" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
