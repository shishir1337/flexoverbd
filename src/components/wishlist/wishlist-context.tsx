"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Wishlist, stored on the device.
 *
 * Only product ids are kept — the catalogue is the source of truth for
 * everything else, so a price change or a rename can never leave a stale copy
 * sitting in someone's saved items. When accounts land this moves server-side
 * and the hook signature stays the same.
 */

const STORAGE_KEY = "flexover.wishlist.v1";

type WishlistValue = {
  ids: string[];
  hydrated: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed))
        setIds(parsed.filter((v) => typeof v === "string"));
    } catch {
      // Corrupt or unavailable storage — start empty.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Non-fatal; the list just will not survive a reload.
    }
  }, [ids, hydrated]);

  const value = useMemo<WishlistValue>(
    () => ({
      ids,
      hydrated,
      has: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((current) =>
          current.includes(id)
            ? current.filter((v) => v !== id)
            : [id, ...current],
        ),
      remove: (id) => setIds((current) => current.filter((v) => v !== id)),
      clear: () => setIds([]),
    }),
    [ids, hydrated],
  );

  return <WishlistContext value={value}>{children}</WishlistContext>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx)
    throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
