/**
 * Orders, stored on the device.
 *
 * There is no backend yet, so a placed order is persisted to localStorage.
 * That is enough to make the whole journey demonstrable end to end —
 * checkout writes an order, the confirmation page reads it back, and both
 * "track order" and the account order list query the same store.
 *
 * Every function here is a stand-in for one API call. When the backend lands,
 * this file becomes a thin fetch wrapper and nothing that imports it changes.
 */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Out for delivery",
  delivered: "Delivered",
};

/**
 * A line as it exists *on an order*, which is not the same thing as a cart
 * line. Every field is a snapshot taken at purchase time, and the variant
 * arrives already rendered ("Navy · EU 42") rather than as a live object —
 * editing or archiving the product must never change what the order says.
 */
export type OrderLine = {
  id: string;
  productId: string;
  title: string;
  price: number;
  qty: number;
  imageSrc: string;
  imageAlt: string;
  imageReady: boolean;
  /** Pre-rendered at purchase time; absent when the product had no options. */
  variantLabel?: string;
  /** Current slug of the product, for a re-order link. Absent once archived. */
  slug?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: { name: string; phone: string; email?: string };
  address: {
    district: string;
    area: string;
    street: string;
    landmark?: string;
  };
  notes?: string;
  /** Who is carrying it and their reference, once it has been handed over. */
  courier?: string;
  trackingNumber?: string;
  /** COD only for now — the type leaves room for gateways later. */
  paymentMethod: "cod";
};

const ORDERS_KEY = "flexover.orders.v1";

function readAll(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

function writeAll(orders: Order[]) {
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Private mode or quota — the order is still shown for this session.
  }
}

/**
 * Human-readable and speakable, because customers read this number out over
 * the phone to support. Format: FB-YYMMDD-XXXX.
 */
export function generateOrderId(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FB-${yy}${mm}${dd}-${rand}`;
}

export function saveOrder(order: Order): Order {
  const orders = readAll();
  orders.unshift(order);
  writeAll(orders.slice(0, 50));
  return order;
}

export function getOrders(): Order[] {
  return readAll();
}

export function getOrder(id: string): Order | null {
  const wanted = id.trim().toUpperCase();
  return readAll().find((o) => o.id.toUpperCase() === wanted) ?? null;
}

/** Lookup for the guest tracking page: order id *or* the phone used to order. */
export function findOrders(query: string): Order[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const digits = q.replace(/\D/g, "");

  return readAll().filter((order) => {
    if (order.id.toLowerCase() === q) return true;
    if (digits.length >= 6) {
      const phone = order.customer.phone.replace(/\D/g, "");
      // Compare on the last 10 digits so +880 / 0 prefixes both match.
      return phone.slice(-10) === digits.slice(-10);
    }
    return false;
  });
}

/**
 * Demo progression: an order advances through the flow over time so the
 * tracking page has something truthful to show. Roughly a stage every 12
 * hours, capped at delivered.
 */
export function derivedStatus(order: Order): OrderStatus {
  const ageHours =
    (Date.now() - new Date(order.createdAt).getTime()) / 3_600_000;
  const stage = Math.min(
    ORDER_STATUS_FLOW.length - 1,
    Math.floor(ageHours / 12),
  );
  const natural = ORDER_STATUS_FLOW[stage];
  // Never move backwards from whatever was stored.
  const storedIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const naturalIndex = ORDER_STATUS_FLOW.indexOf(natural);
  return naturalIndex > storedIndex ? natural : order.status;
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
