import type { OrderStatus } from "@/generated/prisma/client";

/**
 * Order status vocabulary.
 *
 * Deliberately free of `server-only` and of any Prisma client import beyond the
 * generated *type*: the admin's status buttons are a Client Component and need
 * these same labels and rules, so they cannot live next to the queries.
 */

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

/**
 * Which statuses an order may move to next.
 *
 * Shaped around how cash-on-delivery actually works here: an order is placed on
 * the site, confirmed by phone, then packed and shipped. Cancellation stays
 * possible right up to delivery because COD customers cancel often, and a
 * delivered order can still come back as a return.
 *
 * The server re-checks this on every transition — the UI only uses it to decide
 * which buttons to offer.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * The one obvious forward move from each status, as a verb.
 *
 * `ALLOWED_TRANSITIONS` says what is *permitted*; this says what is *expected*,
 * which is what a queue needs to offer as a single button. Cancellation is
 * always allowed and never expected, so it is not here.
 *
 * `PACKED` is deliberately absent. Shipping wants a courier and a tracking
 * number, and a one-click "Ship" that quietly records neither produces parcels
 * nobody can trace — that step earns the detail page.
 */
export const NEXT_STEP: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string }>
> = {
  PLACED: { to: "CONFIRMED", label: "Confirm" },
  CONFIRMED: { to: "PACKED", label: "Pack" },
  SHIPPED: { to: "DELIVERED", label: "Delivered" },
};

/**
 * How long an order may sit in a status before it is late, in hours.
 *
 * A COD shop lives on confirming fast — an unconfirmed order is one the
 * customer may already have forgotten placing. Statuses not listed are either
 * finished or waiting on someone else (a courier), where our own clock is not
 * the useful measure.
 */
export const STALE_AFTER_HOURS: Partial<Record<OrderStatus, number>> = {
  PLACED: 6,
  CONFIRMED: 24,
  PACKED: 24,
};

/** Statuses that put stock back into inventory. */
export const RESTOCKING_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];
