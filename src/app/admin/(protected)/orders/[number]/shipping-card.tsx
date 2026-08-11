"use client";

import { Check, Copy, Pencil, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { FormError, inputCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { setOrderShipping } from "@/server/services/admin/order-actions";

/**
 * Courier and tracking number, after the hand-over.
 *
 * Editable separately from the status change because these get *corrected* far
 * more often than they get set — a courier is swapped at the last minute, a
 * tracking number is mistyped off a paper manifest. Routing that through a
 * status transition would write a bogus event into the order's history every
 * time somebody fixed a digit.
 */
export function ShippingCard({
  number,
  courier,
  trackingNumber,
}: {
  number: string;
  courier: string;
  trackingNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const courierId = useId();
  const trackingId = useId();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ courier, trackingNumber });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setOrderShipping({ number, ...draft });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      toast({ tone: "success", message: "Shipping details updated." });
      router.refresh();
    });
  }

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast({ tone: "success", message: "Tracking number copied." });
    } catch {
      // Clipboard is permission-gated and can simply refuse; the number is
      // on screen either way, so this is not worth an error toast.
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-xs">
      <div className="flex items-center justify-between gap-2 border-line border-b px-4 py-3">
        <h2 className="flex items-center gap-1.5 font-bold text-ink text-sm">
          <Truck aria-hidden className="size-4 text-ink-3" />
          Shipping
        </h2>
        {!editing && (
          <AdminButton
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setDraft({ courier, trackingNumber });
              setEditing(true);
            }}
            aria-label="Edit shipping details"
          >
            <Pencil aria-hidden className="size-3.5" />
          </AdminButton>
        )}
      </div>

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <FormError message={error} />

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
                value={draft.courier}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, courier: e.target.value }))
                }
                className={`mt-1 ${inputCls()}`}
              />
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
                value={draft.trackingNumber}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, trackingNumber: e.target.value }))
                }
                className={`mt-1 font-mono ${inputCls()}`}
              />
            </div>

            <div className="flex gap-2">
              <AdminButton variant="primary" onClick={save} disabled={pending}>
                <Check aria-hidden className="size-4" />
                {pending ? "Saving…" : "Save"}
              </AdminButton>
              <AdminButton onClick={() => setEditing(false)}>
                <X aria-hidden className="size-4" />
                Cancel
              </AdminButton>
            </div>
          </div>
        ) : (
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-2xs text-ink-3">Courier</dt>
              <dd className="font-medium text-ink">
                {courier || <span className="text-ink-4">Not recorded</span>}
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-ink-3">Tracking number</dt>
              <dd className="flex items-center gap-1.5">
                {trackingNumber ? (
                  <>
                    <span className="min-w-0 truncate font-medium font-mono text-ink">
                      {trackingNumber}
                    </span>
                    <AdminButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={copyTracking}
                      aria-label="Copy tracking number"
                    >
                      <Copy aria-hidden className="size-3.5" />
                    </AdminButton>
                  </>
                ) : (
                  <span className="text-ink-4">Not recorded</span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
