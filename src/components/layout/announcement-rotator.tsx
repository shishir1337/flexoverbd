"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "flexover.announcement.v1";
const INTERVAL_MS = 4500;

/**
 * One message at a time.
 *
 * Auto-advancing content needs an escape hatch (WCAG 2.2.2) — the close button
 * is it, and rotation also pauses on hover and on keyboard focus so a message
 * cannot slide away mid-read. The timer is dropped entirely while the tab is
 * hidden; a background tab that keeps re-rendering is pure battery cost on the
 * phones that make up almost all of this traffic.
 */
export function AnnouncementRotator({
  messages,
}: {
  messages: readonly string[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (messages.length < 2 || paused) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      timer ??= setInterval(
        () => setIndex((i) => (i + 1) % messages.length),
        INTERVAL_MS,
      );
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [messages.length, paused]);

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "off");
    } catch {
      // Private mode or a blocked store — hiding for this page view is still
      // the right outcome, it just will not be remembered.
    }
    document.documentElement.classList.add("announcement-off");
  }

  return (
    <>
      {/* aria-hidden: the accessible copy of this list lives in the parent. */}
      <p
        aria-hidden
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="flex min-w-0 items-center gap-2 px-6 text-center text-xs leading-snug font-medium sm:text-[13px]"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />
        {/*
          Keying on the index restarts the animation on every change, which is
          what makes each message fade up rather than swapping instantly.
        */}
        <span key={index} className="animate-announce-in">
          {messages[index]}
        </span>
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcements"
        className="absolute right-0 grid size-11 shrink-0 place-items-center rounded-full text-white/60 tap transition-colors hover:bg-surface/10 hover:text-white"
      >
        <X aria-hidden className="size-4" />
      </button>
    </>
  );
}
