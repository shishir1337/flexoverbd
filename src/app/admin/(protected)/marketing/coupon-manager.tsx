"use client";

import { Check, Pencil, Plus, TicketPercent, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  CheckboxField,
  Field,
  FormError,
  inputCls,
} from "@/components/admin/form";
import { EmptyState } from "@/components/admin/page-header";
import { useToast } from "@/components/admin/toaster";
import { adminButton } from "@/components/admin/ui";
import { cn, formatBDT } from "@/lib/utils";
import type { CouponRow } from "@/server/services/admin/marketing";
import {
  deleteCoupon,
  saveCoupon,
} from "@/server/services/admin/marketing-actions";

type Type = "PERCENT" | "FIXED" | "FREE_DELIVERY";

type Draft = {
  code: string;
  type: Type;
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const TYPES: { value: Type; label: string }[] = [
  { value: "PERCENT", label: "Percentage off" },
  { value: "FIXED", label: "Fixed amount off" },
  { value: "FREE_DELIVERY", label: "Free delivery" },
];

const EMPTY: Draft = {
  code: "",
  type: "PERCENT",
  value: "10",
  minSubtotal: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function describe(c: CouponRow) {
  if (c.type === "FREE_DELIVERY") return "Free delivery";
  if (c.type === "PERCENT") return `${c.value}% off`;
  return `${formatBDT(c.value)} off`;
}

/**
 * Coupons.
 *
 * The list leads with usage rather than configuration, because the question
 * anyone opens this screen with is "is the campaign working" — how many times a
 * code has been redeemed and how much it has actually cost. The rules behind it
 * are one tap away.
 */
export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const baseId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin(c?: CouponRow) {
    setError(null);
    setErrors({});
    setDraft(
      c
        ? {
            code: c.code,
            type: c.type as Type,
            value: String(c.value),
            minSubtotal: c.minSubtotal === null ? "" : String(c.minSubtotal),
            maxDiscount: c.maxDiscount === null ? "" : String(c.maxDiscount),
            usageLimit: c.usageLimit === null ? "" : String(c.usageLimit),
            perUserLimit: c.perUserLimit === null ? "" : String(c.perUserLimit),
            startsAt: c.startsAt,
            endsAt: c.endsAt,
            isActive: c.isActive,
          }
        : EMPTY,
    );
    setEditingId(c?.id ?? null);
    setCreating(!c);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setError(null);
    setErrors({});
  }

  function submit() {
    setError(null);
    setErrors({});
    startTransition(async () => {
      const result = await saveCoupon(creating ? null : editingId, draft);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      cancel();
      router.refresh();
    });
  }

  async function remove(c: CouponRow) {
    const ok = await confirm({
      title: `Delete ${c.code}?`,
      body:
        c.usedCount > 0
          ? "This code has been redeemed, so it will be switched off rather than deleted — past orders need it to explain their discount."
          : "It has never been redeemed, so this removes it completely.",
      confirmLabel: c.usedCount > 0 ? "Switch off" : "Delete",
    });
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteCoupon(c.id);
      // A used coupon is deactivated instead, and says so — not really an
      // error, but it needs surfacing where the click happened.
      toast(
        result.ok
          ? { tone: "success", message: `${c.code} deleted.` }
          : { tone: "info", message: result.error },
      );
      router.refresh();
    });
  }

  const ids = Object.fromEntries(
    [
      "code",
      "type",
      "value",
      "minSubtotal",
      "maxDiscount",
      "usageLimit",
      "perUserLimit",
      "startsAt",
      "endsAt",
    ].map((k) => [k, `${baseId}-${k}`]),
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const editor = (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          id={ids.code}
          label="Code"
          hint="What the customer types. Case does not matter."
          error={errors.code}
        >
          <input
            id={ids.code}
            value={draft.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            className={cn(inputCls(errors.code), "font-mono uppercase")}
          />
        </Field>

        <Field id={ids.type} label="Type" error={errors.type}>
          <select
            id={ids.type}
            value={draft.type}
            onChange={(e) => set("type", e.target.value as Type)}
            className={inputCls(errors.type)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {draft.type !== "FREE_DELIVERY" && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field
            id={ids.value}
            label={draft.type === "PERCENT" ? "Percent off" : "Amount off (৳)"}
            error={errors.value}
          >
            <input
              id={ids.value}
              type="number"
              inputMode="numeric"
              value={draft.value}
              onChange={(e) => set("value", e.target.value)}
              className={cn(inputCls(errors.value), "tnum")}
            />
          </Field>

          {draft.type === "PERCENT" && (
            <Field
              id={ids.maxDiscount}
              label="Cap the discount at (৳)"
              hint="Blank means no cap."
              error={errors.maxDiscount}
            >
              <input
                id={ids.maxDiscount}
                type="number"
                inputMode="numeric"
                value={draft.maxDiscount}
                onChange={(e) => set("maxDiscount", e.target.value)}
                className={cn(inputCls(errors.maxDiscount), "tnum")}
              />
            </Field>
          )}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Field
          id={ids.minSubtotal}
          label="Minimum spend (৳)"
          hint="Blank for none."
          error={errors.minSubtotal}
        >
          <input
            id={ids.minSubtotal}
            type="number"
            inputMode="numeric"
            value={draft.minSubtotal}
            onChange={(e) => set("minSubtotal", e.target.value)}
            className={cn(inputCls(errors.minSubtotal), "tnum")}
          />
        </Field>
        <Field
          id={ids.usageLimit}
          label="Total uses"
          hint="Blank for unlimited."
          error={errors.usageLimit}
        >
          <input
            id={ids.usageLimit}
            type="number"
            inputMode="numeric"
            value={draft.usageLimit}
            onChange={(e) => set("usageLimit", e.target.value)}
            className={cn(inputCls(errors.usageLimit), "tnum")}
          />
        </Field>
        <Field
          id={ids.perUserLimit}
          label="Uses per customer"
          hint="Counted by mobile number."
          error={errors.perUserLimit}
        >
          <input
            id={ids.perUserLimit}
            type="number"
            inputMode="numeric"
            value={draft.perUserLimit}
            onChange={(e) => set("perUserLimit", e.target.value)}
            className={cn(inputCls(errors.perUserLimit), "tnum")}
          />
        </Field>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field id={ids.startsAt} label="Starts" error={errors.startsAt}>
          <input
            id={ids.startsAt}
            type="date"
            value={draft.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
            className={inputCls(errors.startsAt)}
          />
        </Field>
        <Field id={ids.endsAt} label="Ends" error={errors.endsAt}>
          <input
            id={ids.endsAt}
            type="date"
            value={draft.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className={inputCls(errors.endsAt)}
          />
        </Field>
      </div>

      <CheckboxField
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="Accepting redemptions"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={adminButton("primary", "md")}
        >
          <Check aria-hidden className="size-4" />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className={adminButton("secondary", "md")}
        >
          <X aria-hidden className="size-4" />
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-extrabold text-ink">Coupons</h2>
          <p className="mt-0.5 text-ink-3 text-sm">
            Checkout re-checks every rule server-side before it applies one.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => begin()}
            className={adminButton("secondary", "sm", "shrink-0")}
          >
            <Plus aria-hidden className="size-4" />
            New code
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      {creating && (
        <div className="mt-3 rounded-btn border border-brand-200 bg-brand-soft p-3.5">
          {editor}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {coupons.map((c) => (
          <li key={c.id}>
            {editingId === c.id && !creating ? (
              <div className="rounded-btn border border-line p-3.5">
                {editor}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-btn border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-mono font-bold text-sm",
                      c.isActive ? "text-ink" : "text-ink-4 line-through",
                    )}
                  >
                    {c.code}
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    {[
                      describe(c),
                      c.minSubtotal ? `min ${formatBDT(c.minSubtotal)}` : null,
                      c.endsAt ? `until ${c.endsAt}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-ink text-sm tnum">
                    {c.usedCount}
                    {c.usageLimit !== null && (
                      <span className="font-normal text-ink-3">
                        /{c.usageLimit}
                      </span>
                    )}
                  </p>
                  <p className="text-2xs text-ink-3 tnum">
                    {c.redeemedValue > 0
                      ? `${formatBDT(c.redeemedValue)} given`
                      : "unused"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => begin(c)}
                  aria-label={`Edit ${c.code}`}
                  className={adminButton("ghost", "icon", "shrink-0")}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  disabled={pending}
                  aria-label={`Delete ${c.code}`}
                  className={adminButton(
                    "ghost",
                    "icon",
                    "shrink-0 hover:bg-danger-soft hover:text-danger",
                  )}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {coupons.length === 0 && !creating && (
          <li className="py-2">
            <EmptyState
              icon={TicketPercent}
              title="No discount codes yet"
              body="Create one and checkout will accept it straight away."
            />
          </li>
        )}
      </ul>
    </section>
  );
}
