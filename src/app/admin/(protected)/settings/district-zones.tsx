"use client";

import { AlertCircle, Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setDistrictZone } from "@/server/services/admin/settings-actions";

type District = {
  id: string;
  name: string;
  division: string;
  zoneId: string;
};

type ZoneOption = { id: string; name: string };

/**
 * Which zone each district is delivered under.
 *
 * Creating a zone was only half the feature — a zone with no districts prices
 * nothing. This is where a new zone gets filled, and it is separate from
 * creating one on purpose: moving a district changes what customers there are
 * charged, so it should be a deliberate act rather than a side effect.
 *
 * Sixty-four districts is a wall if rendered flat, so they are grouped by
 * division and filtered by a search box. Each row saves on change rather than
 * behind a Save button — there is one field, its value is the whole edit, and a
 * dirty-state dance over a single dropdown is friction for nothing.
 */
export function DistrictZones({
  districts,
  zones,
}: {
  districts: District[];
  zones: ZoneOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? districts.filter(
          (d) =>
            d.name.toLowerCase().includes(needle) ||
            d.division.toLowerCase().includes(needle),
        )
      : districts;

    const byDivision = new Map<string, District[]>();
    for (const d of matching) {
      const list = byDivision.get(d.division) ?? [];
      list.push(d);
      byDivision.set(d.division, list);
    }
    return [...byDivision.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [districts, query]);

  function move(district: District, zoneId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setDistrictZone({
        districtId: district.id,
        zoneId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedId(district.id);
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-extrabold text-ink">Districts</h2>
      <p className="mt-0.5 text-ink-3 text-sm">
        Which zone each district is priced under. Changes affect future orders
        only — every order keeps the fee it was charged.
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

      <div className="relative mt-3">
        <Search
          aria-hidden
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-ink-4"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a district or division"
          aria-label="Filter districts"
          className="h-10 w-full rounded-btn border border-line bg-surface pl-9 text-base text-ink placeholder:text-ink-4 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="mt-4 rounded-btn bg-surface-2 px-3 py-6 text-center text-ink-3 text-sm">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {grouped.map(([division, rows]) => (
            <div key={division}>
              <p className="font-semibold text-2xs text-ink-4 uppercase tracking-wide">
                {division}
              </p>
              <ul className="mt-1.5 divide-y divide-line rounded-btn border border-line">
                {rows.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-ink text-sm">
                      {d.name}
                    </span>
                    {savedId === d.id && (
                      <Check
                        aria-label="Saved"
                        className="size-4 shrink-0 text-success"
                      />
                    )}
                    <label className="sr-only" htmlFor={`zone-${d.id}`}>
                      Delivery zone for {d.name}
                    </label>
                    <select
                      id={`zone-${d.id}`}
                      value={d.zoneId}
                      disabled={pending}
                      onChange={(e) => move(d, e.target.value)}
                      className={cn(
                        "h-9 shrink-0 rounded-btn border border-line bg-surface px-2 text-ink text-sm",
                        "focus:border-brand-500 focus:outline-none disabled:opacity-50",
                      )}
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
