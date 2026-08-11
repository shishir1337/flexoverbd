"use client";

import { Check, MessageSquarePlus, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FormError, inputCls, textareaCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { AdminButton, adminButton } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/client";
import { RESTOCKING_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import {
  addOrderNote,
  updateOrderStatus,
} from "@/server/services/admin/order-actions";

/**
 * Common Bangladeshi couriers, offered as a datalist rather than a closed
 * select: most shops use two or three, but the list is not ours to fix, and a
 * dropdown that omits whoever they actually use is worse than free text.
 */
const COURIERS = [
  "Pathao",
  "Steadfast",
  "RedX",
  "Sundarban",
  "SA Paribahan",
  "eCourier",
  "Paperfly",
  "Own rider",
];

/**
 * Status transitions and notes.
 *
 * Only the transitions the server will actually accept are offered, so the UI
 * cannot suggest a move that then fails. The server re-validates anyway — this
 * is a convenience, not the guard.
 *
 * Shipping is the one transition that asks for something first. The courier and
 * tracking number are what every "where is my parcel" call needs, and the
 * moment someone marks an order shipped is the only moment they reliably have
 * both in front of them.
 */
export function StatusControls({
  number,
  current,
  allowed,
  courier,
  trackingNumber,
}: {
  number: string;
  current: OrderStatus;
  allowed: OrderStatus[];
  courier: string;
  trackingNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const noteId = useId();
  const courierId = useId();
  const trackingId = useId();

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);

  /** Non-null while the ship form is open. */
  const [shipping, setShipping] = useState<{
    courier: string;
    trackingNumber: string;
  } | null>(null);

  function commit(status: OrderStatus, details?: typeof shipping) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus({
        number,
        status,
        courier: details?.courier || undefined,
        trackingNumber: details?.trackingNumber || undefined,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setShipping(null);
      toast({
        tone: "success",
        message: `Marked ${STATUS_LABEL[status].toLowerCase()}.`,
      });
      router.refresh();
    });
  }

  async function move(status: OrderStatus) {
    // Shipping asks for the courier first rather than firing straight away.
    if (status === "SHIPPED") {
      setShipping({ courier, trackingNumber });
      return;
    }

    if (RESTOCKING_STATUSES.includes(status)) {
      const ok = await confirm({
        title: `Mark this order ${STATUS_LABEL[status].toLowerCase()}?`,
        body: "Every item goes back into stock and this cannot be undone from here.",
        confirmLabel: STATUS_LABEL[status],
      });
      if (!ok) return;
    }

    commit(status);
  }

  function submitNote() {
    setError(null);
    startTransition(async () => {
      const result = await addOrderNote({
        number,
        note,
        isCustomerVisible: noteVisible,
      });
      if (!result.ok) {
        toast({ tone: "error", message: result.error });
        return;
      }
      setNote("");
      setNoteVisible(false);
      toast({ tone: "success", message: "Note added." });
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-xs">
      {dialog}

      <div className="border-line border-b px-4 py-3">
        <h2 className="font-bold text-ink text-sm">Update status</h2>
        <p className="mt-0.5 text-2xs text-ink-3">
          Currently {STATUS_LABEL[current].toLowerCase()}
        </p>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-3">
            <FormError message={error} />
          </div>
        )}

        {shipping ? (
          <div className="rounded-btn border border-brand-200 bg-brand-soft p-3">
            <p className="flex items-center gap-1.5 font-bold text-ink text-sm">
              <Truck aria-hidden className="size-4 text-brand-600" />
              Handing over to the courier
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor={courierId}
                  className="block font-semibold text-ink text-xs"
                >
                  Courier
                </label>
                <input
                  id={courierId}
                  list="admin-couriers"
                  value={shipping.courier}
                  onChange={(e) =>
                    setShipping((s) =>
                      s ? { ...s, courier: e.target.value } : s,
                    )
                  }
                  placeholder="Pathao"
                  className={`mt-1 ${inputCls()}`}
                />
                <datalist id="admin-couriers">
                  {COURIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label
                  htmlFor={trackingId}
                  className="block font-semibold text-ink text-xs"
                >
                  Tracking number
                </label>
                <input
                  id={trackingId}
                  value={shipping.trackingNumber}
                  onChange={(e) =>
                    setShipping((s) =>
                      s ? { ...s, trackingNumber: e.target.value } : s,
                    )
                  }
                  placeholder="What customers ask for"
                  className={`mt-1 font-mono ${inputCls()}`}
                />
              </div>

              <div className="flex gap-2">
                <AdminButton
                  variant="primary"
                  onClick={() => commit("SHIPPED", shipping)}
                  disabled={pending}
                >
                  <Check aria-hidden className="size-4" />
                  {pending ? "Saving…" : "Mark shipped"}
                </AdminButton>
                <AdminButton onClick={() => setShipping(null)}>
                  <X aria-hidden className="size-4" />
                  Cancel
                </AdminButton>
              </div>
            </div>
          </div>
        ) : allowed.length === 0 ? (
          <p className="rounded-btn bg-surface-2 px-3 py-2.5 text-ink-3 text-sm">
            This order is closed — no further status changes are possible.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowed.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => move(s)}
                disabled={pending}
                className={adminButton(
                  RESTOCKING_STATUSES.includes(s) ? "danger-soft" : "primary",
                )}
              >
                {s === "SHIPPED" ? (
                  <Truck aria-hidden className="size-4" />
                ) : (
                  <Check aria-hidden className="size-4" />
                )}
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 border-line border-t pt-4">
          <label
            htmlFor={noteId}
            className="block font-semibold text-ink text-sm"
          >
            Add a note
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Called customer, confirmed address…"
            className={`mt-1.5 ${textareaCls()}`}
          />
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-ink-2 text-sm">
            <input
              type="checkbox"
              checked={noteVisible}
              onChange={(e) => setNoteVisible(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand-600"
            />
            <span>
              Show this to the customer
              <span className="block text-2xs text-ink-3">
                Notes are internal unless you tick this.
              </span>
            </span>
          </label>
          <AdminButton
            onClick={submitNote}
            disabled={pending || !note.trim()}
            className="mt-2.5"
          >
            <MessageSquarePlus aria-hidden className="size-4" />
            Save note
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
