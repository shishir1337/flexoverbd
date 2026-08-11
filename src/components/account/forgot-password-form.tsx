"use client";

import { AlertCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/**
 * Request a password reset link.
 *
 * The response is deliberately identical whether or not the address has an
 * account: telling someone "no account with that email" turns this form into a
 * way to enumerate the customer list. So a success message is shown either way,
 * and the wording says "if that address has an account" rather than implying
 * one was found.
 */
export function ForgotPasswordForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: authError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });

    setPending(false);

    // Only a transport failure is surfaced. An unknown address still reports
    // success, for the reason in the doc comment above.
    if (authError && authError.status !== 400) {
      setError("Could not send the link right now. Please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft">
          <MailCheck aria-hidden className="size-6 text-success" />
        </span>
        <p className="mt-3 font-bold text-ink">Check your email</p>
        <p className="mt-1 text-ink-2 text-sm">
          If that address has an account, a link to set a new password is on its
          way. It works once and lasts an hour.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-on text-sm hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2.5 font-medium text-danger text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor={emailId}
          className="block font-semibold text-ink text-sm"
        >
          Email
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          className="mt-1.5 h-12 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-ink-2 text-sm">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-on hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
