"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth/client";
import { isValidPhone } from "@/lib/phone";
import { safeRedirect } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";

/**
 * Sign in and register.
 *
 * One component for both because they differ by two fields and a verb, and
 * keeping them together is what stops the two screens drifting apart in
 * validation or wording.
 *
 * Note what is *not* here: nothing about an account is required to buy. The
 * copy says so on both pages, because a forced-signup wall is the single
 * biggest drop-off in Bangladeshi cash-on-delivery checkout and the schema was
 * built guest-first specifically to avoid it.
 */
export function AuthForm({
  mode,
  next,
}: {
  mode: "signin" | "signup";
  next?: string;
}) {
  const router = useRouter();
  const ids = {
    name: useId(),
    email: useId(),
    phone: useId(),
    password: useId(),
  };

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";
  const set = (key: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Client-side checks are courtesy only — Better Auth enforces both the
    // minimum length and the email shape on the server.
    if (isSignup && values.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (isSignup && values.phone && !isValidPhone(values.phone)) {
      setError("Enter a valid mobile number, e.g. 01712345678.");
      return;
    }

    setPending(true);

    const result = isSignup
      ? await signUp.email({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          // Orders are matched to a person by mobile number, so capturing it
          // at signup is what makes the account's order history work at all.
          phone: values.phone.trim() || undefined,
        })
      : await signIn.email({
          email: values.email.trim(),
          password: values.password,
        });

    if (result.error) {
      setPending(false);
      setError(
        result.error.message ??
          (isSignup
            ? "Could not create your account. Please try again."
            : "That email and password do not match."),
      );
      return;
    }

    // `next` is attacker-controlled; see `safeRedirect`.
    router.replace(safeRedirect(next));
    router.refresh();
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

      {isSignup && (
        <Field id={ids.name} label="Your name">
          <input
            id={ids.name}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
            autoComplete="name"
            className={inputCls}
          />
        </Field>
      )}

      <Field id={ids.email} label="Email">
        <input
          id={ids.email}
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          className={inputCls}
        />
      </Field>

      {isSignup && (
        <Field
          id={ids.phone}
          label="Mobile number"
          hint="So your past orders show up here. Optional."
        >
          <input
            id={ids.phone}
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
            inputMode="numeric"
            placeholder="01712345678"
            className={cn(inputCls, "tnum")}
          />
        </Field>
      )}

      <Field
        id={ids.password}
        label="Password"
        hint={isSignup ? "At least 8 characters." : undefined}
      >
        <div className="relative">
          <input
            id={ids.password}
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={cn(inputCls, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="-translate-y-1/2 absolute top-1/2 right-1 grid size-10 place-items-center rounded-btn text-ink-3 tap hover:text-ink"
          >
            {showPassword ? (
              <EyeOff aria-hidden className="size-4.5" />
            ) : (
              <Eye aria-hidden className="size-4.5" />
            )}
          </button>
        </div>
      </Field>

      {!isSignup && (
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-on text-sm hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? isSignup
            ? "Creating your account…"
            : "Signing in…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-ink-2 text-sm">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={
            isSignup
              ? `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`
              : `/register${next ? `?next=${encodeURIComponent(next)}` : ""}`
          }
          className="font-semibold text-brand-on hover:underline"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}

const inputCls =
  "h-12 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink text-sm">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-2xs text-ink-3">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
