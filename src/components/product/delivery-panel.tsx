import { BadgeCheck, RotateCcw, Truck, Wallet } from "lucide-react";
import { formatBDT } from "@/lib/utils";
import { getCommerceSettings, getZonePair } from "@/server/services/settings";

/**
 * Delivery cost and terms, stated plainly on the product page.
 *
 * "How much is delivery and can I pay cash?" is the question that decides a
 * Bangladeshi order, and burying it in a policy page is how carts get
 * abandoned. Answering it next to the price removes the reason to leave.
 */
export async function DeliveryPanel({
  freeDelivery,
}: {
  freeDelivery: boolean;
}) {
  const [commerce, zones] = await Promise.all([
    getCommerceSettings(),
    getZonePair(),
  ]);

  return (
    <div className="rounded-card border border-line bg-surface-2">
      <dl className="divide-y divide-line">
        <div className="flex items-start gap-3 p-3.5">
          <Truck
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-brand-600"
          />
          <div className="min-w-0 flex-1">
            <dt className="text-sm font-bold text-ink">Delivery</dt>
            <dd className="mt-1 space-y-0.5 text-[13px] text-ink-2">
              {freeDelivery ? (
                <p className="font-semibold text-success">
                  Free delivery on this item
                </p>
              ) : (
                <p className="text-ink-3">
                  Free over {formatBDT(commerce.freeShippingThreshold)}
                </p>
              )}
              <p>
                Inside Dhaka —{" "}
                <span className="font-semibold text-ink">
                  {formatBDT(zones.inside.fee)}
                </span>
                , {zones.inside.etaLabel}
              </p>
              <p>
                Outside Dhaka —{" "}
                <span className="font-semibold text-ink">
                  {formatBDT(zones.outside.fee)}
                </span>
                , {zones.outside.etaLabel}
              </p>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5">
          <Wallet
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-brand-600"
          />
          <div>
            <dt className="text-sm font-bold text-ink">Cash on Delivery</dt>
            <dd className="mt-0.5 text-[13px] text-ink-2">
              Pay the courier when it reaches your hand. Available in all 64
              districts.
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5">
          <RotateCcw
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-brand-600"
          />
          <div>
            <dt className="text-sm font-bold text-ink">
              {commerce.returnWindowDays}-day return
            </dt>
            <dd className="mt-0.5 text-[13px] text-ink-2">
              Not right? Return it within {commerce.returnWindowDays} days of
              delivery, no questions asked.
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5">
          <BadgeCheck
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-brand-600"
          />
          <div>
            <dt className="text-sm font-bold text-ink">100% authentic</dt>
            <dd className="mt-0.5 text-[13px] text-ink-2">
              Sourced directly. Sealed packaging, checked before dispatch.
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
