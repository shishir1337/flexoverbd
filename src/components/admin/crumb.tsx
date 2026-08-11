"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The name of the record the current page is about.
 *
 * The breadcrumb is derived from the URL, which is right for every segment
 * except the last one on a detail page — `/admin/products/cmsf0q7s2004n…`
 * ends in a cuid, and "cmsf0q7s2004nzwtuatnidrfi" tells nobody anything.
 *
 * Rather than have each page declare a breadcrumb — which pages forget to do —
 * `PageHeader` already knows the human name and publishes it here.
 */

type Published = { label: string; path: string };

type CrumbState = {
  current: Published | null;
  publish: (next: Published) => void;
};

const CrumbContext = createContext<CrumbState>({
  current: null,
  publish: () => {},
});

export function CrumbProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Published | null>(null);

  // Stable, and it bails when nothing changed: `publish` is called from an
  // effect, so an identity that changed with every state update would feed
  // straight back into that effect and spin.
  const publish = useCallback((next: Published) => {
    setCurrent((prev) =>
      prev?.label === next.label && prev.path === next.path ? prev : next,
    );
  }, []);

  const value = useMemo<CrumbState>(
    () => ({ current, publish }),
    [current, publish],
  );

  return (
    <CrumbContext.Provider value={value}>{children}</CrumbContext.Provider>
  );
}

/** The published name, but only if it belongs to the page currently shown. */
export function useCrumbLabel() {
  const { current } = useContext(CrumbContext);
  const pathname = usePathname();
  return current?.path === pathname ? current.label : null;
}

/**
 * Rendered by `PageHeader`. Takes no space — it exists to hand the title the
 * header was already given to the breadcrumb above it.
 */
export function PublishCrumb({ value }: { value: string }) {
  const { publish } = useContext(CrumbContext);
  const pathname = usePathname();

  useEffect(() => {
    publish({ label: value, path: pathname });
  }, [value, pathname, publish]);

  return null;
}
