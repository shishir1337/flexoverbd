"use client";

import { AlertCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

export function LoginForm({ banned }: { banned?: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [error, setError] = useState<string | null>(
    banned ? "This account has been suspended." : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const { error: authError } = await signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (authError) {
      // Deliberately vague: telling an attacker which half was wrong turns the
      // form into an account-enumeration oracle.
      setError("Email or password is incorrect.");
      setPending(false);
      return;
    }

    // The server layout decides whether this user may actually see /admin —
    // signing in successfully is not the same as being staff.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor={emailId}
          className="mb-1.5 block text-sm font-semibold text-ink"
        >
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor={passwordId}
          className="mb-1.5 block text-sm font-semibold text-ink"
        >
          Password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-1 w-full"
      >
        <LogIn aria-hidden className="size-4.5" />
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
