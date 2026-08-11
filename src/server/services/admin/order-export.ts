"use server";

import { requirePermission } from "@/lib/auth/guards";
import { recordAudit } from "@/server/audit";
import { exportOrders, type OrderFilters } from "./orders";

/**
 * Orders as CSV, matching whatever filters are on screen.
 *
 * Returned as a string for the browser to save rather than streamed from a
 * route handler: the filters already live in the page's state, and a download
 * URL would mean serialising them into a second place that could disagree with
 * the list the person is looking at.
 */

/**
 * Excel decides a cell is a formula from its first character, so a customer
 * name beginning `=`, `+`, `-` or `@` becomes executable on open — the CSV
 * injection everyone forgets. Prefixing a quote neutralises it and is invisible
 * in the cell.
 */
function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "Order",
  "Placed",
  "Status",
  "Customer",
  "Phone",
  "District",
  "Area",
  "Address",
  "Items",
  "Subtotal",
  "Delivery",
  "Discount",
  "Total",
  "Courier",
  "Tracking",
];

export async function exportOrdersCsv(
  filters: OrderFilters = {},
): Promise<{ ok: true; csv: string; count: number } | { ok: false }> {
  const session = await requirePermission({ order: ["export"] });

  const orders = await exportOrders(filters);

  const rows = orders.map((o) =>
    [
      o.number,
      o.placedAt.toISOString().slice(0, 16).replace("T", " "),
      o.status,
      o.customerName,
      o.customerPhone,
      o.district.name,
      o.area,
      [o.line1, o.landmark].filter(Boolean).join(", "),
      o.items
        .map(
          (i) =>
            `${i.qty}× ${i.titleSnapshot}${i.variantLabel ? ` (${i.variantLabel})` : ""}`,
        )
        .join("; "),
      o.subtotal,
      o.deliveryFee,
      o.discount,
      o.total,
      o.courier ?? "",
      o.trackingNumber ?? "",
    ]
      .map(cell)
      .join(","),
  );

  await recordAudit({
    userId: session.user.id,
    action: "order.export",
    entity: "Order",
    entityId: "*",
    after: { count: orders.length, filters: filters as never },
  });

  return {
    ok: true,
    // A BOM, so Excel opens the Bangla and the ৳ sign as UTF-8 rather than
    // mojibake — without it every customer name in Bangla arrives unreadable.
    csv: `\uFEFF${[COLUMNS.join(","), ...rows].join("\r\n")}`,
    count: orders.length,
  };
}
