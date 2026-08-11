"use client";

import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  saveDeliveryZone,
} from "@/server/services/admin/settings-actions";

type Zone = {
  id: string;
  name: string;
  fee: number;
  etaLabel: string;
  districtCount: number;
};

/**
 * Delivery zones.
 *
 * The fee here is what checkout actually charges — every one of the 64
 * districts inherits from its zone unless it carries its own override. Showing
 * the district count makes the blast radius of an edit obvious before saving.
 */
export function DeliveryZones({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Partial<Zone>>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", fee: "0", etaLabel: "" });

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createDeliveryZone(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft({ name: "", fee: "0", etaLabel: "" });
      setAdding(false);
      router.refresh();
    });
  }

  function remove(zone: Zone) {
    setError(null);
    startTransition(async () => {
      const result = await deleteDeliveryZone(zone.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function save(zone: Zone) {
    const draft = drafts[zone.id] ?? {};
    setError(null);
    startTransition(async () => {
      const result = await saveDeliveryZone({
        id: zone.id,
        fee: draft.fee ?? zone.fee,
        etaLabel: draft.etaLabel ?? zone.etaLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDrafts((d) => {
        const next = { ...d };
        delete next[zone.id];
        return next;
      });
      setSavedId(zone.id);
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-extrabold text-ink">Delivery zones</h2>
      <p className="mt-0.5 text-ink-3 text-sm">
        Districts inherit these fees. Checkout uses them to price every order.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-btn bg-danger-soft px-3 py-2 font-medium text-danger text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Zero zones rendered as a heading, a sentence and nothing else — the
          screen looked broken rather than empty, and there was no hint that
          checkout was silently unable to price an order. Delivery zones are
          seeded rather than created here, so this says where they come from
          instead of offering an "Add" that does not exist yet. */}
      {zones.length === 0 && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-btn border border-warn bg-warn-soft px-3 py-2.5 text-ink-2 text-sm"
        >
          <AlertCircle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-warn"
          />
          <span>
            <strong className="font-semibold text-ink">
              No delivery zones exist.
            </strong>{" "}
            Checkout cannot price delivery until at least one is present, so no
            order can be completed. Zones and the 64 districts that inherit from
            them are seeded with the database — restore them with{" "}
            <code className="rounded bg-surface-3 px-1 font-mono text-2xs">
              pnpm shop:restore
            </code>
            .
          </span>
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {zones.map((z) => {
          const draft = drafts[z.id] ?? {};
          const dirty =
            (draft.fee !== undefined && draft.fee !== z.fee) ||
            (draft.etaLabel !== undefined && draft.etaLabel !== z.etaLabel);

          return (
            <li key={z.id} className="rounded-btn border border-line p-3">
              <p className="font-semibold text-ink text-sm">
                {z.name}
                <span className="ml-2 font-normal text-2xs text-ink-3">
                  {z.districtCount}{" "}
                  {z.districtCount === 1 ? "district" : "districts"}
                </span>
              </p>

              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label
                    htmlFor={`fee-${z.id}`}
                    className="block text-2xs text-ink-3"
                  >
                    Fee (৳)
                  </label>
                  <input
                    id={`fee-${z.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={String(draft.fee ?? z.fee)}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [z.id]: { ...d[z.id], fee: Number(e.target.value) },
                      }))
                    }
                    className="h-10 w-24 rounded-btn border border-line bg-surface px-3 text-base text-ink tnum focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`eta-${z.id}`}
                    className="block text-2xs text-ink-3"
                  >
                    ETA label
                  </label>
                  <input
                    id={`eta-${z.id}`}
                    value={draft.etaLabel ?? z.etaLabel}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [z.id]: { ...d[z.id], etaLabel: e.target.value },
                      }))
                    }
                    className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => save(z)}
                  disabled={!dirty || pending}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-btn px-3 font-semibold text-sm tap",
                    dirty
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-line text-ink-4",
                  )}
                >
                  <Save aria-hidden className="size-4" />
                  {savedId === z.id && !dirty ? "Saved" : "Save"}
                </button>
                {/* Only offered where it can succeed — a zone that still owns
                    districts cannot go, and the server says so with a count. */}
                {z.districtCount === 0 && (
                  <button
                    type="button"
                    onClick={() => remove(z)}
                    disabled={pending}
                    aria-label={`Delete ${z.name}`}
                    className="grid size-11 shrink-0 place-items-center rounded-btn text-ink-3 tap hit-touch hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Adding a zone, not just editing the seeded two. A shop that grows a
          courier rate for one city had no way to say so before. */}
      {adding ? (
        <div className="mt-4 rounded-btn border border-brand-300 bg-brand-soft/40 p-3">
          <p className="font-semibold text-ink text-sm">New zone</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="zone-name" className="block text-2xs text-ink-3">
                Name
              </label>
              <input
                id="zone-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Chattogram city"
                className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="zone-fee" className="block text-2xs text-ink-3">
                Fee (৳)
              </label>
              <input
                id="zone-fee"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.fee}
                onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                className="h-10 w-24 rounded-btn border border-line bg-surface px-3 text-base text-ink tnum focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="zone-eta" className="block text-2xs text-ink-3">
                ETA label
              </label>
              <input
                id="zone-eta"
                value={draft.etaLabel}
                onChange={(e) =>
                  setDraft({ ...draft, etaLabel: e.target.value })
                }
                placeholder="1–2 days"
                className="h-10 w-full rounded-btn border border-line bg-surface px-3 text-base text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="mt-2 text-2xs text-ink-3">
            A new zone starts empty. Districts belong to exactly one zone, so
            filling it means moving them out of another — done from the district
            list, not here, because it reprices anything already in flight.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={pending || !draft.name.trim() || !draft.etaLabel.trim()}
              className={cn(
                "h-10 rounded-btn px-3 font-semibold text-sm tap",
                draft.name.trim() && draft.etaLabel.trim()
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "border border-line text-ink-4",
              )}
            >
              Add zone
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-10 rounded-btn border border-line px-3 font-semibold text-ink-2 text-sm tap hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 flex h-10 items-center gap-1.5 rounded-btn border border-line px-3 font-semibold text-ink-2 text-sm tap hover:bg-surface-2 hover:text-ink"
        >
          <Plus aria-hidden className="size-4" />
          Add a zone
        </button>
      )}
    </section>
  );
}
