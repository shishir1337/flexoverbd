"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useSettings } from "@/components/settings-provider";
import type { Variant } from "@/data/types";

export type CartLine = {
  /**
   * Unique per *variant*, not per product — `p-001::colour:Navy::size:M`.
   * Keying on the product alone would merge a Medium and a Large into one
   * line of two, and the warehouse would have no idea what to pick.
   */
  id: string;
  /** The underlying product, for links and wishlist lookups. */
  productId: string;
  /** The chosen combination, absent for products with no options. */
  variant?: Variant;
  slug: string;
  title: string;
  price: number;
  compareAt?: number;
  imageSrc: string;
  imageAlt: string;
  /** Resolved on the server: is the real artwork on disk yet? Prevents the
   *  drawer from requesting an image that is still a placeholder. */
  imageReady: boolean;
  /**
   * The product's own free-delivery promise. Carried on the line because the
   * checkout preview has to apply the same rule the server does — the PDP
   * says "Free delivery on this item", and the total must honour it.
   */
  freeDelivery?: boolean;
  qty: number;
};

type State = { lines: CartLine[]; hydrated: boolean };

type Action =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: Omit<CartLine, "qty">; qty: number }
  | { type: "setQty"; id: string; qty: number }
  | { type: "remove"; id: string }
  | { type: "clear" };

/**
 * Delivery zone. Bangladeshi couriers price inside-Dhaka and outside-Dhaka
 * differently, so the shopper picks once in the cart and checkout inherits it
 * rather than asking twice.
 */
export type DeliveryZone = "inside-dhaka" | "outside-dhaka";

// v2: cart lines gained productId + variant. Reading a v1 cart would produce
// lines with no product reference, so the key is bumped rather than migrated.
const STORAGE_KEY = "flexover.cart.v2";
const ZONE_KEY = "flexover.zone.v1";

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines, hydrated: true };

    case "add": {
      const existing = state.lines.find((l) => l.id === action.line.id);
      const lines = existing
        ? state.lines.map((l) =>
            l.id === action.line.id ? { ...l, qty: l.qty + action.qty } : l,
          )
        : [...state.lines, { ...action.line, qty: action.qty }];
      return { ...state, lines };
    }

    case "setQty":
      return {
        ...state,
        lines:
          action.qty <= 0
            ? state.lines.filter((l) => l.id !== action.id)
            : state.lines.map((l) =>
                l.id === action.id ? { ...l, qty: action.qty } : l,
              ),
      };

    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };

    case "clear":
      return { ...state, lines: [] };
  }
}

type CartContextValue = {
  lines: CartLine[];
  /** False until localStorage has been read — guards against hydration drift. */
  hydrated: boolean;
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  zone: DeliveryZone;
  setZone: (zone: DeliveryZone) => void;
  /** Delivery charge for the current zone, waived above the free threshold. */
  deliveryFee: number;
  total: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Last added product title — drives the confirmation toast. */
  lastAdded: { title: string; at: number } | null;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // Delivery fees and the free-shipping threshold come from the database via
  // the layout, not from a constant — the checkout Server Action prices orders
  // from the same rows, and a divergence charges people a different number
  // from the one they were quoted.
  const { commerce, zones } = useSettings();
  // Narrowed to primitives so the memo below can depend on the numbers rather
  // than on freshly-found objects, which would change identity every render.
  const insideFee = zones.find((z) => z.isInsideDhaka)?.fee ?? 0;
  const outsideFee = zones.find((z) => !z.isInsideDhaka)?.fee ?? 0;
  const { freeShippingThreshold } = commerce;

  const [state, dispatch] = useReducer(reducer, { lines: [], hydrated: false });
  const [isOpen, setIsOpen] = useState(false);
  const [zone, setZoneState] = useState<DeliveryZone>("inside-dhaka");
  const [lastAdded, setLastAdded] = useState<{
    title: string;
    at: number;
  } | null>(null);

  // Read persisted cart after mount. Rendering an empty cart on the server and
  // filling it in here keeps the markup identical on both sides.
  useEffect(() => {
    let lines: CartLine[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) lines = parsed;
      }
    } catch {
      // Corrupt or unavailable storage (private mode) — start clean.
    }
    dispatch({ type: "hydrate", lines });

    try {
      const savedZone = window.localStorage.getItem(ZONE_KEY);
      if (savedZone === "inside-dhaka" || savedZone === "outside-dhaka") {
        setZoneState(savedZone);
      }
    } catch {
      // Unavailable storage — the default zone is fine.
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // Quota or private mode — the cart still works for this session.
    }
  }, [state.lines, state.hydrated]);

  // Lock background scroll while the drawer is open, without the layout jump
  // that `overflow: hidden` alone causes on desktop scrollbars.
  useEffect(() => {
    if (!isOpen) return;
    const { body } = document;
    const previous = body.style.overflow;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = previous;
      body.style.paddingRight = "";
    };
  }, [isOpen]);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = state.lines.reduce((n, l) => n + l.price * l.qty, 0);

    const baseFee = zone === "inside-dhaka" ? insideFee : outsideFee;
    // Free delivery only applies once there is something in the basket.
    const deliveryFee =
      subtotal > 0 && subtotal < freeShippingThreshold ? baseFee : 0;

    return {
      lines: state.lines,
      hydrated: state.hydrated,
      count,
      subtotal,
      zone,
      deliveryFee,
      total: subtotal + deliveryFee,
      isOpen,
      lastAdded,
      setZone: (next: DeliveryZone) => {
        setZoneState(next);
        try {
          window.localStorage.setItem(ZONE_KEY, next);
        } catch {
          // Non-fatal: the choice just will not survive a reload.
        }
      },
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add: (line, qty = 1) => {
        dispatch({ type: "add", line, qty });
        setLastAdded({ title: line.title, at: Date.now() });
      },
      setQty: (id, qty) => dispatch({ type: "setQty", id, qty }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [
    state.lines,
    state.hydrated,
    isOpen,
    lastAdded,
    zone,
    insideFee,
    outsideFee,
    freeShippingThreshold,
  ]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
