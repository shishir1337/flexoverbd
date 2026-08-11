"use client";

import { Check, Send } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Validation runs on submit, not on every keystroke — telling someone their
 * email is invalid while they are still typing it is the classic form
 * anti-pattern. The error sits directly under the field and is announced.
 */
export function NewsletterForm() {
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();

    if (!value) return setError("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return setError(
        "That doesn't look like a valid email — please check it.",
      );
    }

    setError(null);
    setDone(true);
    // Wired to the mailing-list endpoint once the backend lands.
  }

  if (done) {
    return (
      <output className="flex items-center justify-center gap-2 rounded-btn bg-surface/15 px-4 py-3 text-sm font-semibold text-white sm:justify-start">
        <Check aria-hidden className="size-5 shrink-0" strokeWidth={2.5} />
        You&apos;re on the list — watch out for your welcome offer.
      </output>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="send"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // `flex-1` only from sm: the container is flex-col below that, where
            // flex-1 would govern height and collapse h-12 to ~21px.
            "h-12 w-full min-w-0 rounded-btn border bg-surface px-4 text-ink placeholder:text-ink-3 sm:flex-1",
            "focus:outline-none focus:ring-2 focus:ring-white/70",
            error ? "border-danger" : "border-transparent",
          )}
        />
        <Button type="submit" variant="dark" size="lg" className="shrink-0">
          <Send aria-hidden className="size-4" />
          Subscribe
        </Button>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 rounded-md bg-scrim/25 px-3 py-2 text-xs font-medium text-white"
        >
          {error}
        </p>
      )}
    </form>
  );
}
