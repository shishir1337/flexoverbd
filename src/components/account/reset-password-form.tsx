"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/**
 * Set a new password from a reset link.
 *
 * On success it sends people to `/login?reset=1` rather than signing them in
 * automatically: whoever holds the link may not be whoever holds the password
 * manager, and asking for the new password once proves it took.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const ids = { password: useId(), confirm: useId() };

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    const { error: authError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (authError) {
      setPending(false);
      setError(
        "That link has expired or has already been used. Ask for a new one.",
      );
      return;
    }

    router.replace("/login?reset=1");
    router.refresh();
  }

  const inputCls =
    "h-12 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none";

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
          htmlFor={ids.password}
          className="block font-semibold text-ink text-sm"
        >
          New password
        </label>
        <p className="mt-0.5 text-2xs text-ink-3">At least 8 characters.</p>
        <div className="relative mt-1.5">
          <input
            id={ids.password}
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={cn(inputCls, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="-translate-y-1/2 absolute top-1/2 right-1 grid size-10 place-items-center rounded-btn text-ink-3 tap hover:text-ink"
          >
            {show ? (
              <EyeOff aria-hidden className="size-4.5" />
            ) : (
              <Eye aria-hidden className="size-4.5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor={ids.confirm}
          className="block font-semibold text-ink text-sm"
        >
          Confirm new password
        </label>
        <input
          id={ids.confirm}
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={cn(inputCls, "mt-1.5")}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
