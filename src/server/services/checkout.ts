"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { tags } from "@/server/cache-tags";
import { sendMetaEvent } from "@/server/meta/capi";
import { checkCoupon } from "@/server/services/coupons";

/**
 * Order placement.
 *
 * The one rule that matters here: **nothing the client sends about money is
 * trusted.** The browser tells us which variants and how many; every price,
 * the delivery fee and the total are recomputed from the database. A tampered
 * cart cannot buy a ৳2,690 wok for ৳1.
 *
 * Stock is decremented with a conditional update inside the transaction, so two
 * shoppers racing for the last unit cannot both win — the second one's update
 * matches zero rows and the whole order rolls back.
 */

const lineSchema = z.object({
  productId: z.string().min(1),
  colour: z.string().nullish(),
  size: z.string().nullish(),
  qty: z.number().int().min(1).max(10),
});

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  // 01XXXXXXXXX — the shape every BD mobile number takes.
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? v)
    .refine((v) => isValidPhone(v), PHONE_ERROR),
  email: z.email("Enter a valid email address.").or(z.literal("")).optional(),
  district: z.string().min(1, "Please choose your district."),
  area: z.string().trim().min(2, "Please enter your area or thana."),
  line1: z.string().trim().min(4, "Please enter your house and road."),
  landmark: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(lineSchema).min(1, "Your cart is empty."),
  /** Optional; re-validated here, never trusted from the preview. */
  couponCode: z.string().trim().max(40).optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type CheckoutResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** FB-YYMMDD-XXXX — the format already shown to customers, kept as-is. */
function orderNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FB-${yy}${mm}${dd}-${rand}`;
}

function variantLabel(
  colour: string | null,
  size: string | null,
  system: string | null,
): string | null {
  const parts: string[] = [];
  if (colour) parts.push(colour);
  if (size) parts.push(`${system === "FOOTWEAR" ? "EU " : "Size "}${size}`);
  return parts.length ? parts.join(" · ") : null;
}

export async function placeOrder(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the form.", fieldErrors };
  }

  const data = parsed.data;

  // --- Resolve the address before touching stock ---------------------------
  const district = await prisma.district.findFirst({
    where: { name: data.district, isActive: true },
    include: { zone: true },
  });
  if (!district) {
    return {
      ok: false,
      error: "We do not deliver to that district yet.",
      fieldErrors: { district: "Please choose a district from the list." },
    };
  }

  // --- Resolve every line to a real variant --------------------------------
  const variants = await Promise.all(
    data.lines.map((line) =>
      prisma.productVariant.findFirst({
        where: {
          productId: line.productId,
          colourName: line.colour ?? null,
          sizeValue: line.size ?? null,
          isActive: true,
          product: { isActive: true, archivedAt: null },
        },
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: "asc" },
                take: 1,
                include: { media: true },
              },
              flashItems: {
                where: {
                  campaign: {
                    isActive: true,
                    startsAt: { lte: new Date() },
                    endsAt: { gte: new Date() },
                  },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ),
  );

  type ResolvedItem = {
    variantId: string;
    productId: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    titleSnapshot: string;
    skuSnapshot: string;
    variantLabel: string | null;
    imageUrlSnapshot: string | null;
    freeDelivery: boolean;
  };

  const items: ResolvedItem[] = [];
  for (const [i, variant] of variants.entries()) {
    const line = data.lines[i];
    if (!variant) {
      return {
        ok: false,
        error: "One of the items in your cart is no longer available.",
      };
    }
    if (variant.stock < line.qty) {
      return {
        ok: false,
        error:
          variant.stock === 0
            ? `${variant.product.title} has just sold out.`
            : `Only ${variant.stock} left of ${variant.product.title}.`,
      };
    }

    // Price comes from the database, never the request body. Flash price wins,
    // then the variant override, then the product price.
    const unitPrice =
      variant.product.flashItems[0]?.salePrice ??
      variant.priceOverride ??
      variant.product.price;

    items.push({
      variantId: variant.id,
      productId: variant.productId,
      qty: line.qty,
      unitPrice,
      lineTotal: unitPrice * line.qty,
      titleSnapshot: variant.product.title,
      skuSnapshot: variant.sku,
      variantLabel: variantLabel(
        variant.colourName,
        variant.sizeValue,
        variant.sizeSystem,
      ),
      imageUrlSnapshot: variant.product.images[0]?.media.url ?? null,
      freeDelivery: variant.product.freeDelivery,
    });
  }

  // --- Money ---------------------------------------------------------------
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  const commerce = (
    await prisma.setting.findUnique({ where: { key: "commerce" } })
  )?.value as { freeShippingThreshold?: number } | undefined;
  const threshold = commerce?.freeShippingThreshold ?? 2000;

  const baseFee = district.feeOverride ?? district.zone.fee;
  const qualifiesFree =
    subtotal >= threshold || items.every((i) => i.freeDelivery);
  let deliveryFee = qualifiesFree ? 0 : baseFee;

  // The coupon is re-checked from scratch against these freshly computed
  // figures. Whatever the form previewed is irrelevant — it may have been
  // computed against a different basket, or made up entirely.
  let discount = 0;
  let couponId: string | null = null;
  let couponUsageLimit: number | null = null;
  if (data.couponCode) {
    const check = await checkCoupon({
      code: data.couponCode,
      subtotal,
      deliveryFee,
      phone: data.phone,
    });
    if (!check.ok) {
      return {
        ok: false,
        error: check.message,
        fieldErrors: { couponCode: check.message },
      };
    }
    couponId = check.couponId;
    couponUsageLimit = check.usageLimit;
    if (check.freeDelivery) {
      deliveryFee = 0;
    } else {
      discount = check.discount;
    }
  }

  const total = subtotal + deliveryFee - discount;

  // --- Write ---------------------------------------------------------------
  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        // Conditional decrement: matches zero rows if someone else took the
        // last unit between our read above and this write, which aborts the
        // transaction rather than overselling.
        const { count } = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (count === 0) {
          throw new Error(`OUT_OF_STOCK:${item.titleSnapshot}`);
        }
      }

      const created = await tx.order.create({
        data: {
          number: orderNumber(),
          customerName: data.name,
          customerPhone: data.phone,
          customerEmail: data.email || null,
          districtId: district.id,
          area: data.area,
          line1: data.line1,
          landmark: data.landmark || null,
          notes: data.notes || null,
          status: "PLACED",
          paymentMethod: "COD",
          paymentStatus: "PENDING",
          subtotal,
          deliveryFee,
          discount,
          total,
          couponId,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              titleSnapshot: i.titleSnapshot,
              variantLabel: i.variantLabel,
              skuSnapshot: i.skuSnapshot,
              priceSnapshot: i.unitPrice,
              imageUrlSnapshot: i.imageUrlSnapshot,
              qty: i.qty,
              lineTotal: i.lineTotal,
            })),
          },
          events: {
            create: {
              status: "PLACED",
              note: "Order placed on the website.",
              isCustomerVisible: true,
            },
          },
        },
      });

      // Redemption and counter in the same transaction as the order, so a
      // usage limit cannot be beaten by two people checking out at once.
      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            phone: data.phone,
            orderId: created.id,
            amount: discount > 0 ? discount : baseFee,
          },
        });
        // Conditional, for the same reason as the stock decrement above: the
        // limit was checked before the transaction opened, and two shoppers
        // redeeming the last use at once would otherwise both succeed.
        const { count } = await tx.coupon.updateMany({
          where: {
            id: couponId,
            ...(couponUsageLimit !== null
              ? { usedCount: { lt: couponUsageLimit } }
              : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (count === 0) throw new Error("COUPON_EXHAUSTED");
      }

      // The ledger that explains every stock number.
      await tx.stockMovement.createMany({
        data: items.map((i) => ({
          variantId: i.variantId,
          delta: -i.qty,
          reason: "ORDER" as const,
          orderId: created.id,
        })),
      });

      // Sales counters drive the best-seller rail and the "N sold" line.
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.qty } },
        });
      }

      return created;
    });

    // Stock and sold counts changed, so listings are stale.
    revalidateTag(tags.products, "max");
    revalidateTag(tags.flashSale, "max");

    /**
     * Purchase, server-side.
     *
     * Sent here rather than from the confirmation page because this is a
     * cash-on-delivery shop: the order is real the moment this transaction
     * commits, and a shopper who closes the tab before /checkout/success
     * loads has still bought something. Browser-only Purchase would also lose
     * every shopper running an ad blocker.
     *
     * `event_id` is the order number — already unique, already stable, and the
     * browser fires the same one, so Meta dedupes without a shared random id.
     *
     * Awaited rather than fired and forgotten: serverless runtimes freeze the
     * moment a response is returned, which would cancel an un-awaited request
     * roughly at random. `sendMetaEvent` never throws and times out at five
     * seconds, so the cost of waiting is bounded and an order can never fail
     * because Meta did.
     */
    await sendMetaEvent({
      eventName: "Purchase",
      eventId: order.number,
      user: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        city: district?.name ?? null,
        country: "bd",
        externalId: data.phone,
      },
      customData: {
        value: total,
        currency: "BDT",
        order_id: order.number,
        num_items: items.reduce((n, i) => n + i.qty, 0),
        content_type: "product",
        content_ids: items.map((i) => i.skuSnapshot),
        contents: items.map((i) => ({
          id: i.skuSnapshot,
          quantity: i.qty,
          item_price: i.unitPrice,
        })),
      },
    });

    return { ok: true, orderNumber: order.number };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "COUPON_EXHAUSTED") {
      return {
        ok: false,
        error: "That code was fully redeemed while you were checking out.",
      };
    }
    if (message.startsWith("OUT_OF_STOCK:")) {
      return {
        ok: false,
        error: `${message.slice("OUT_OF_STOCK:".length)} sold out while you were checking out.`,
      };
    }
    console.error("placeOrder failed", e);
    return {
      ok: false,
      error: "Something went wrong placing your order. Please try again.",
    };
  }
}
