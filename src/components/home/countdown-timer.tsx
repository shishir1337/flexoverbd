"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Parts = { h: string; m: string; s: string };

const BLANK: Parts = { h: "--", m: "--", s: "--" };

function partsUntil(target: number): Parts {
  const diff = Math.max(0, target - Date.now());
  const total = Math.floor(diff / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h: pad(Math.floor(total / 3600)),
    m: pad(Math.floor((total % 3600) / 60)),
    s: pad(total % 60),
  };
}

/**
 * Counts down to the next local midnight, which is when the daily deal resets.
 *
 * The server has no idea what time it is for the visitor, so it renders
 * `--:--:--` and the real value appears on mount. That avoids a hydration
 * mismatch and, because the digits are tabular, avoids a layout shift too.
 */
export function CountdownTimer({ className }: { className?: string }) {
  const [parts, setParts] = useState<Parts>(BLANK);

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const target = midnight.getTime();

    setParts(partsUntil(target));
    const id = setInterval(() => setParts(partsUntil(target)), 1000);
    return () => clearInterval(id);
  }, []);

  const live = parts !== BLANK;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="timer"
      aria-live="off"
      aria-label={
        live
          ? `Offer ends in ${parts.h} hours ${parts.m} minutes`
          : "Loading offer countdown"
      }
    >
      {(["hours", "minutes", "seconds"] as const).map((unit, i) => (
        <span key={unit} className="flex items-center gap-1">
          {i > 0 && <span className="text-sm font-bold text-ink-3">:</span>}
          <span className="grid h-7 min-w-7 place-items-center rounded-md bg-scrim px-1 text-[13px] font-bold text-white tnum">
            {unit === "hours"
              ? parts.h
              : unit === "minutes"
                ? parts.m
                : parts.s}
          </span>
        </span>
      ))}
    </div>
  );
}
