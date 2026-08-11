"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { updateOrderItemQty } from "@/server/services/admin/order-edit-actions";

/**
 * Quantity controls for one order line.
 *
 * Plus/minus rather than a number input: the realistic edit on a phone call is
 * "make it two" or "drop that one", not typing an arbitrary figure, and a
 * spinner that fires a server round trip on every keystroke is worse than two
 * deliberate taps.
 *
 * Stock moves with each change and the server refuses an increase it cannot
 * cover, so the error people see is the real one rather than an optimistic
 * success followed by a short delivery.
 */
export function EditItemQty({
  number,
  itemId,
  title,
  qty,
  editable,
  isOnlyItem,
}: {
  number: string;
  itemId: string;
  title: string;
  qty: number;
  editable: boolean;
  /** The last line cannot be removed — that is a cancellation. */
  isOnlyItem: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function change(next: number) {
    setBusy(true);
    startTransition(async () => {
      const result = await updateOrderItemQty({ number, itemId, qty: next });
      setBusy(false);
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      toast({
        tone: "success",
        message: next === 0 ? `${title} removed.` : `Quantity set to ${next}.`,
      });
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Remove ${title}?`,
      body: "The units go back into stock and the order total is recalculated.",
      confirmLabel: "Remove",
    });
    if (ok) change(0);
  }

  if (!editable) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded bg-surface-3 font-bold text-ink-2 text-xs tnum">
        {qty}
      </span>
    );
  }

  const disabled = pending || busy;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {dialog}
      <AdminButton
        variant="ghost"
        size="icon-sm"
        disabled={disabled || qty <= 1}
        onClick={() => change(qty - 1)}
        aria-label={`Reduce ${title} to ${qty - 1}`}
      >
        <Minus aria-hidden className="size-3.5" />
      </AdminButton>

      <span className="min-w-6 text-center font-bold text-ink text-sm tnum">
        {qty}
      </span>

      <AdminButton
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={() => change(qty + 1)}
        aria-label={`Increase ${title} to ${qty + 1}`}
      >
        <Plus aria-hidden className="size-3.5" />
      </AdminButton>

      {!isOnlyItem && (
        <AdminButton
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={remove}
          aria-label={`Remove ${title}`}
          className="hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 aria-hidden className="size-3.5" />
        </AdminButton>
      )}
    </div>
  );
}
