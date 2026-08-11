"use client";

import { Printer } from "lucide-react";

/**
 * The print button, hidden from the printed page itself.
 *
 * No auto-print on mount: a dialog that opens by itself steals focus, and staff
 * often open several slips in tabs before printing them as a batch.
 */
export function PrintTrigger() {
  return (
    <div className="mb-4 flex justify-end print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex h-11 items-center gap-1.5 rounded-btn bg-neutral-900 px-4 font-semibold text-sm text-white"
      >
        <Printer aria-hidden className="size-4" />
        Print
      </button>
    </div>
  );
}
