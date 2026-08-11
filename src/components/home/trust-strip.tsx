import { icon } from "@/lib/icon-map";
import { getTrustItems } from "@/server/services/content";

/**
 * The four objections that stop a first-time Bangladeshi shopper from
 * checking out: "will I have to pay before I see it", "how long", "what if it
 * is wrong", "is it fake". Answering them this early measurably lifts
 * add-to-cart rates, so it sits directly under the hero rather than in the
 * footer.
 */
export async function TrustStrip() {
  const items = await getTrustItems();
  // Nothing configured is a legitimate state — render nothing rather than an
  // empty bordered box under the hero.
  if (items.length === 0) return null;

  return (
    <section aria-label="Why shop with FlexOver BD" className="container-page">
      <ul className="grid grid-cols-2 gap-2.5 rounded-card border border-line bg-linear-to-br from-brand-soft to-surface p-3 sm:gap-3 lg:grid-cols-4 lg:p-4">
        {items.map(({ id, icon: iconName, title, subtitle }) => {
          const Icon = icon(iconName);
          return (
            // Stacked below sm: at 360px a two-column row leaves the copy barely
            // 110px, which shatters "Pay when it reaches your hand" into three
            // lines. Putting the icon above hands the text the full column.
            <li
              key={id}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface shadow-card sm:size-11">
                <Icon
                  aria-hidden
                  className="size-4.5 text-brand-600 sm:size-5.5"
                  strokeWidth={1.9}
                />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] leading-tight font-bold text-ink sm:text-sm">
                  {title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-3 sm:text-xs">
                  {subtitle}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
