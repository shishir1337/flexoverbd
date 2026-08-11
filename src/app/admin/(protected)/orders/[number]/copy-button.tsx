"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Copy a value to the clipboard.
 *
 * Every parcel means retyping a name, a phone number and an address into a
 * courier's own system. Retyping is where a digit gets dropped and a parcel
 * goes to the wrong street — and on COD, an undelivered parcel is a real loss,
 * not just a redelivery.
 *
 * The confirmation is on the button itself rather than a toast: the answer to
 * "did that copy?" belongs where the thumb already is.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** What was copied, for the screen reader and the tooltip. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Denied permission, or an insecure origin. Falling back to a prompt
      // would be worse than doing nothing: the text is on screen already.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-btn px-1.5 py-1 font-semibold text-2xs tap hit-touch transition-colors",
        copied
          ? "text-success"
          : "text-ink-3 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
