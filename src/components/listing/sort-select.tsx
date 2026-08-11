"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import {
  buildHref,
  type ListingSearchParams,
  SORT_OPTIONS,
} from "@/lib/listing";
import { cn } from "@/lib/utils";

/**
 * The one control that isn't a plain link — a native `<select>` is a much
 * better sort affordance on a phone than six stacked links, and it opens the
 * OS picker. Navigation happens through the router so the URL stays the source
 * of truth, exactly like the filters.
 */
export function SortSelect({
  pathname,
  params,
  value,
  className,
}: {
  pathname: string;
  params: ListingSearchParams;
  value: string;
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor={id}
        className="flex shrink-0 items-center gap-1.5 text-sm text-ink-3"
      >
        <ArrowUpDown aria-hidden className="size-4" />
        <span className="hidden sm:inline">Sort</span>
      </label>
      <select
        id={id}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const href = buildHref(pathname, params, { sort: e.target.value });
          startTransition(() => router.push(href, { scroll: false }));
        }}
        // w-full so it can shrink inside a narrow phone toolbar; left to its
        // intrinsic size it is ~160px and pushes the row past 360px.
        //
        // text-base below sm is not cosmetic: iOS Safari zooms the whole page
        // when a control under 16px takes focus, and does not zoom back out.
        // On the phones that are 98% of this traffic, opening the sort picker
        // would leave the listing zoomed in.
        className="h-11 w-full min-w-0 rounded-btn border border-line bg-surface px-3 text-base font-medium text-ink tap disabled:opacity-60 sm:h-10 sm:w-auto sm:text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
