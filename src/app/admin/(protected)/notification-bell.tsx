"use client";

import {
  Bell,
  BellOff,
  CheckCircle2,
  MessageSquare,
  PackageX,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminButton } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type {
  AdminNotification,
  NotificationFeed,
} from "@/server/services/admin/notifications";

const ICONS = {
  order: ShoppingBag,
  review: MessageSquare,
  stock: PackageX,
  consent: ShieldAlert,
} as const;

/** How often to look for new work. Long enough to be cheap, short enough that
 *  an order placed while someone is packing is noticed within a minute. */
const POLL_MS = 60_000;

/** Remembered across sessions so muting survives a reload. */
const MUTE_KEY = "flexover.admin.chime";

/**
 * Notification bell.
 *
 * Polls rather than holding a socket open: this is one small query a minute for
 * a handful of staff, and a websocket would be infrastructure to run, secure
 * and reconnect for no gain at this size.
 *
 * The chime only fires when an order arrives that is *newer than the newest one
 * seen* — not merely when the count goes up. A count can rise because a
 * colleague unpublished a review, and a shop that hears "new order" for that
 * quickly learns to ignore the sound entirely.
 */
export function NotificationBell({ initial }: { initial: NotificationFeed }) {
  const [feed, setFeed] = useState(initial);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const latestSeen = useRef(initial.latestOrderAt);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMuted(localStorage.getItem(MUTE_KEY) === "off");
  }, []);

  /**
   * A short two-tone chime, synthesised rather than shipped as a file.
   *
   * An audio asset would be another request, another thing to host, and a
   * licence to check. Two oscillator notes through a gain ramp is about forty
   * lines of nothing and sounds deliberate rather than alarming.
   */
  const chime = useCallback(() => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;

      const ctx = new Ctor();
      const now = ctx.currentTime;

      // Perfect fifth, rising — reads as "something arrived", not "something
      // is wrong". Falling intervals are what alarms use.
      for (const [i, freq] of [880, 1318.5].entries()) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;

        const start = now + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      }

      setTimeout(() => void ctx.close(), 800);
    } catch {
      // Autoplay policy, no audio device, or a locked context. The badge and
      // the panel still work; sound is the enhancement, not the notification.
    }
  }, []);

  // Poll for new work.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/admin/notifications", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const next: NotificationFeed = await response.json();

        const arrived =
          next.latestOrderAt &&
          (!latestSeen.current || next.latestOrderAt > latestSeen.current);

        setFeed(next);
        if (arrived) {
          latestSeen.current = next.latestOrderAt;
          if (localStorage.getItem(MUTE_KEY) !== "off") chime();
        }
      } catch {
        // Offline or a blip. The next tick tries again; a failed poll is not
        // worth an error message on someone's screen.
      }
    }

    const id = setInterval(check, POLL_MS);
    // Also check on refocus — someone coming back to the tab after lunch
    // should not wait a minute to see what arrived.
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [chime]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointer = (e: PointerEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "off" : "on");
    if (!next) chime();
  }

  const urgent = feed.items.filter((i) => i.urgent).length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          feed.count === 0
            ? "Notifications, nothing waiting"
            : `Notifications, ${feed.count} waiting`
        }
        className="relative grid size-9 place-items-center rounded-btn text-ink-2 tap transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Bell aria-hidden className="size-4.5" />
        {feed.count > 0 && (
          <span
            aria-hidden
            className={cn(
              "-top-0.5 -right-0.5 absolute grid min-w-4.5 place-items-center rounded-full px-1 font-bold text-[10px] text-white tnum",
              urgent > 0 ? "bg-danger" : "bg-ink-3",
            )}
          >
            {feed.count > 9 ? "9+" : feed.count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-100 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface shadow-pop motion-safe:animate-[toast-in_140ms_ease-out]"
        >
          <div className="flex items-center justify-between gap-2 border-line border-b px-3.5 py-2.5">
            <p className="font-bold text-ink text-sm">Needs attention</p>
            <AdminButton
              variant="ghost"
              size="icon-sm"
              onClick={toggleMute}
              aria-label={muted ? "Turn the chime on" : "Turn the chime off"}
              title={muted ? "Chime is off" : "Chime is on"}
            >
              {muted ? (
                <BellOff aria-hidden className="size-3.5" />
              ) : (
                <Bell aria-hidden className="size-3.5" />
              )}
            </AdminButton>
          </div>

          {feed.items.length === 0 ? (
            <div className="px-3.5 py-8 text-center">
              <CheckCircle2
                aria-hidden
                className="mx-auto size-7 text-success"
              />
              <p className="mt-2 font-semibold text-ink text-sm">All clear</p>
              <p className="mt-0.5 text-ink-3 text-xs">
                No orders waiting and nothing to moderate.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(26rem,60vh)] divide-y divide-line overflow-y-auto">
              {feed.items.map((item) => (
                <li key={item.id}>
                  <Row item={item} onNavigate={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  onNavigate,
}: {
  item: AdminNotification;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.kind];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-start gap-2.5 px-3.5 py-2.5 tap transition-colors hover:bg-surface-2"
    >
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
          item.urgent
            ? "bg-danger-soft text-danger"
            : "bg-surface-2 text-ink-3",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink text-sm">
          {item.title}
        </span>
        <span className="block truncate text-2xs text-ink-3">
          {item.detail}
        </span>
      </span>
    </Link>
  );
}
