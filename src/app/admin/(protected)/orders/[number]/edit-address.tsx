"use client";

import { Check, MapPin, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { FormError, inputCls, textareaCls } from "@/components/admin/form";
import { useToast } from "@/components/admin/toaster";
import { AdminButton } from "@/components/admin/ui";
import { updateOrderAddress } from "@/server/services/admin/order-edit-actions";

export type DistrictOption = { id: string; name: string; division: string };

/**
 * The delivery address, correctable in place.
 *
 * Cash-on-delivery customers ring to fix a house number or a mistyped digit
 * more or less daily, and the alternative was cancelling a perfectly good
 * order. Editing is only offered while the parcel is still with us — the
 * server enforces that too.
 *
 * The district stays a closed list for the same reason it is one at checkout:
 * couriers price and route by district, and free text is the single biggest
 * cause of an undeliverable parcel.
 */
export function EditAddress({
  number,
  editable,
  districts,
  initial,
}: {
  number: string;
  /** False once it is with a courier. */
  editable: boolean;
  districts: DistrictOption[];
  initial: {
    customerName: string;
    customerPhone: string;
    districtId: string;
    area: string;
    line1: string;
    landmark: string;
    notes: string;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const baseId = useId();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderAddress({ number, ...draft });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      toast({ tone: "success", message: "Delivery details updated." });
      router.refresh();
    });
  }

  // Grouped by division so a 64-option list is navigable.
  const byDivision = districts.reduce<Record<string, DistrictOption[]>>(
    (acc, d) => {
      const group = acc[d.division] ?? [];
      group.push(d);
      acc[d.division] = group;
      return acc;
    },
    {},
  );

  if (!editing) {
    return (
      <AdminButton
        variant="ghost"
        size="icon-sm"
        disabled={!editable}
        title={
          editable
            ? "Edit delivery details"
            : "Cannot edit once it is with a courier"
        }
        onClick={() => {
          setDraft(initial);
          setEditing(true);
        }}
        aria-label="Edit delivery details"
      >
        <Pencil aria-hidden className="size-3.5" />
      </AdminButton>
    );
  }

  const ids = {
    name: `${baseId}-name`,
    phone: `${baseId}-phone`,
    district: `${baseId}-district`,
    area: `${baseId}-area`,
    line1: `${baseId}-line1`,
    landmark: `${baseId}-landmark`,
    notes: `${baseId}-notes`,
  };

  return (
    <div className="mt-3 space-y-3 rounded-btn border border-brand-200 bg-brand-soft p-3">
      <p className="flex items-center gap-1.5 font-bold text-ink text-sm">
        <MapPin aria-hidden className="size-4 text-brand-600" />
        Edit delivery details
      </p>

      <FormError message={error} />

      <div>
        <label
          htmlFor={ids.name}
          className="block font-semibold text-ink text-xs"
        >
          Name
        </label>
        <input
          id={ids.name}
          value={draft.customerName}
          onChange={(e) => set("customerName", e.target.value)}
          className={`mt-1 ${inputCls()}`}
        />
      </div>

      <div>
        <label
          htmlFor={ids.phone}
          className="block font-semibold text-ink text-xs"
        >
          Mobile number
        </label>
        <input
          id={ids.phone}
          type="tel"
          inputMode="numeric"
          value={draft.customerPhone}
          onChange={(e) => set("customerPhone", e.target.value)}
          className={`mt-1 tnum ${inputCls()}`}
        />
      </div>

      <div>
        <label
          htmlFor={ids.district}
          className="block font-semibold text-ink text-xs"
        >
          District
        </label>
        <select
          id={ids.district}
          value={draft.districtId}
          onChange={(e) => set("districtId", e.target.value)}
          className={`mt-1 ${inputCls()}`}
        >
          {Object.entries(byDivision).map(([division, options]) => (
            <optgroup key={division} label={division}>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-2xs text-ink-3">
          Changing this re-prices delivery from that district&apos;s zone.
        </p>
      </div>

      <div>
        <label
          htmlFor={ids.area}
          className="block font-semibold text-ink text-xs"
        >
          Area or thana
        </label>
        <input
          id={ids.area}
          value={draft.area}
          onChange={(e) => set("area", e.target.value)}
          className={`mt-1 ${inputCls()}`}
        />
      </div>

      <div>
        <label
          htmlFor={ids.line1}
          className="block font-semibold text-ink text-xs"
        >
          House and road
        </label>
        <input
          id={ids.line1}
          value={draft.line1}
          onChange={(e) => set("line1", e.target.value)}
          className={`mt-1 ${inputCls()}`}
        />
      </div>

      <div>
        <label
          htmlFor={ids.landmark}
          className="block font-semibold text-ink text-xs"
        >
          Landmark
        </label>
        <input
          id={ids.landmark}
          value={draft.landmark}
          onChange={(e) => set("landmark", e.target.value)}
          className={`mt-1 ${inputCls()}`}
        />
      </div>

      <div>
        <label
          htmlFor={ids.notes}
          className="block font-semibold text-ink text-xs"
        >
          Note for the rider
        </label>
        <textarea
          id={ids.notes}
          rows={2}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={`mt-1 ${textareaCls()}`}
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
  );
}
