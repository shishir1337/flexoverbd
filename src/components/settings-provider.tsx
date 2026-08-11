"use client";

import { createContext, useContext } from "react";
import type { StorefrontSettings } from "@/server/services/settings";

/**
 * Store settings for Client Components.
 *
 * Client Components cannot query, so the storefront layout fetches once on the
 * server and hands the values down. Without this, anything interactive — the
 * cart drawer's free-delivery bar, the checkout total preview — would keep
 * reading the old hardcoded constants, and an admin lowering the free-delivery
 * threshold would change what the server charges while the UI kept quoting the
 * old figure.
 *
 * Server Components should call the service directly rather than use this.
 */
const SettingsContext = createContext<StorefrontSettings | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: StorefrontSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): StorefrontSettings {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error(
      "useSettings must be used inside the storefront layout's SettingsProvider.",
    );
  }
  return value;
}

/** Convenience for the common case. */
export function useCommerce() {
  return useSettings().commerce;
}

export function useContactInfo() {
  return useSettings().contact;
}

export type ZoneOption = {
  key: "inside-dhaka" | "outside-dhaka";
  label: string;
  fee: number;
  eta: string;
};

/**
 * Delivery zones as the cart and checkout radio groups want them.
 *
 * The cart stores a zone as one of two literal keys because that is what
 * persists to localStorage and what `placeOrder` accepts; the database stores
 * rows with generated ids. This is the single place that bridges the two, so
 * the label, fee and ETA a shopper sees all come from the row the server will
 * price against. The fallbacks only fire on an unseeded database.
 */
export function useZoneOptions(): ZoneOption[] {
  const { zones } = useSettings();
  const inside = zones.find((z) => z.isInsideDhaka);
  const outside = zones.find((z) => !z.isInsideDhaka);

  return [
    {
      key: "inside-dhaka",
      label: inside?.name ?? "Inside Dhaka",
      fee: inside?.fee ?? 0,
      eta: inside?.etaLabel ?? "1–2 days",
    },
    {
      key: "outside-dhaka",
      label: outside?.name ?? "Outside Dhaka",
      fee: outside?.fee ?? 0,
      eta: outside?.etaLabel ?? "2–4 days",
    },
  ];
}
