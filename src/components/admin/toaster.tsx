"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Admin toasts.
 *
 * Before this, every action either printed a sentence somewhere inside the
 * component that triggered it or said nothing at all — so saving a setting at
 * the bottom of a long form gave no feedback unless you scrolled back up, and
 * a successful reorder gave none anywhere. A toast is the only feedback channel
 * that works regardless of where on the page the action was fired from.
 *
 * Rendered through a portal into `document.body` for the same reason the
 * storefront's cart drawer is: the admin shell has a `position: sticky` sidebar
 * and scrolling main, and a fixed element inside either of those is positioned
 * against the wrong box.
 */

export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  /** Optional single action, e.g. "Undo" or "View order". */
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{
  push: (toast: ToastInput) => void;
} | null>(null);

/** Errors stay until dismissed; nobody should miss a failed save. */
const DURATIONS: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  error: 0,
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const TONES: Record<ToastTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info/5 text-info",
};

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      // Capped at three: a bulk action that fails on six rows should not bury
      // the screen it happened on.
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);

      const ttl = DURATIONS[toast.tone];
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            // Announced politely: a toast is confirmation, not an interruption,
            // and `assertive` would cut across whatever a screen reader is
            // already reading.
            aria-live="polite"
            aria-atomic="false"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
          >
            {toasts.map((toast) => {
              const Icon = ICONS[toast.tone];
              return (
                <output
                  key={toast.id}
                  className={cn(
                    "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border px-3.5 py-3 shadow-card-hover",
                    "motion-safe:animate-[toast-in_180ms_ease-out]",
                    TONES[toast.tone],
                  )}
                >
                  <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0" />
                  <span className="min-w-0 flex-1 font-medium text-ink-2 text-sm">
                    {toast.message}
                  </span>
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action?.onClick();
                        dismiss(toast.id);
                      }}
                      className="shrink-0 font-bold text-sm underline"
                    >
                      {toast.action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss"
                    className="-mr-1 grid size-6 shrink-0 place-items-center rounded text-ink-3 hover:text-ink"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </output>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside the admin Toaster.");
  }
  return ctx.push;
}
