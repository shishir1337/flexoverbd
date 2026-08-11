import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Forgot your password",
  description: "Get a link to set a new FlexOver BD password.",
  robots: { index: false, follow: false },
};

/**
 * Fully static — the form talks to Better Auth from the client, so there is
 * nothing per-request here and no reason to make anyone wait on a server render
 * to see it.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="container-page py-3 pb-14">
      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Home", href: "/" },
          { label: "Sign in", href: "/login" },
          { label: "Forgot password" },
        ]}
      />

      <div className="mx-auto max-w-sm">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft">
            <KeyRound aria-hidden className="size-7 text-brand-600" />
          </span>
          <h1 className="mt-3 font-extrabold text-2xl text-ink sm:text-3xl">
            Forgot your password
          </h1>
          <p className="mt-1.5 text-ink-2 text-sm">
            We will email you a link to set a new one.
          </p>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
