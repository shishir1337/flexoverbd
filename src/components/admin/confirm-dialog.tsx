"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { adminButton } from "./ui";

/**
 * Confirmation for destructive admin actions.
 *
 * Deleting a coupon, a banner or a customer screenshot used to happen on one
 * click of a small icon button, with no way back — on a phone, next to an edit
 * pencil, that is a mis-tap away from losing work. Built on `<dialog>` so the
 * browser supplies the focus trap, the backdrop, Escape-to-close and the
 * inertness of everything behind it, none of which is worth reimplementing.
 *
 * Used through `useConfirm()`, which returns a promise, so a caller reads as
 * `if (!(await confirm({...}))) return;` rather than splitting into callbacks.
 *
 * Backdrop clicks deliberately do *not* dismiss. Escape and Cancel both do, and
 * for a dialog whose whole purpose is to catch an accidental tap, one more way
 * to dismiss it by accident is the wrong trade.
 */

export type ConfirmOptions = {
  title: string;
  /** What will actually happen. Be specific — name the record. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button. Default true; pass false for a merely-notable action. */
  destructive?: boolean;
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (options && !el.open) el.showModal();
    if (!options && el.open) el.close();
  }, [options]);

  const dialog = (
    <dialog
      ref={dialogRef}
      // Escape and backdrop clicks both count as "no". Without this the promise
      // would never settle and the caller would hang forever.
      onCancel={(e) => {
        e.preventDefault();
        settle(false);
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-line bg-surface p-0 text-ink",
        "backdrop:bg-scrim/60 open:motion-safe:animate-[toast-in_150ms_ease-out]",
      )}
    >
      {options && (
        <div className="p-5">
          <div className="flex items-start gap-3">
            {options.destructive !== false && (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-soft">
                <AlertTriangle aria-hidden className="size-4.5 text-danger" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-extrabold text-base text-ink">
                {options.title}
              </h2>
              {options.body && (
                <p className="mt-1 text-ink-2 text-sm">{options.body}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => settle(false)}
              className={adminButton("secondary", "md")}
            >
              {options.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              // Focused on open so Enter confirms and Escape cancels, which is
              // what a keyboard user expects from a modal like this.
              // biome-ignore lint/a11y/noAutofocus: a modal is exactly where autofocus belongs.
              autoFocus
              onClick={() => settle(true)}
              className={adminButton(
                options.destructive === false ? "primary" : "danger",
                "md",
              )}
            >
              {options.confirmLabel ?? "Delete"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );

  return { confirm, dialog };
}
