// backend/src/services/checkout.service.ts
// Pre‑checkout validation service, Stripe PaymentIntent creation,
// and order finalisation.
// UPDATED: new order items now have fulfillmentStatus = CONFIRMED
//          so sellers can immediately ship them.

import { prisma } from '../db.js';
import { getUserCart, InsufficientStockError } from './cart.service.js';
import { calculateDiscount } from './coupon.service.js';
import { stripe } from '../config/stripe.js';
import type { Order } from '@prisma/client';
import { FulfillmentStatus } from '@prisma/client'; // <-- NEW

import {
  sendCustomerOrderConfirmation,
  sendSellerNewOrderNotification,
} from './notification.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutLineItem {
  productId: string;
  variationId: string | null;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  sellerId: string;
  sellerName: string;
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  subtotal: number;
  items: CheckoutLineItem[];
}

export interface CheckoutPreview {
  items: CheckoutLineItem[];
  sellers: SellerGroup[];
  subtotal: number;
  discountAmount: number;
  coupon?: { code: string; type: string; value: number };
  shippingEstimate?: string;
  total: number;
}

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

export class PaymentNotFoundError extends Error {
  constructor(message = 'Payment not found or already processed') {
    super(message);
    this.name = 'PaymentNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Checkout validation
// ---------------------------------------------------------------------------

export async function validateCheckout(
  userId: string,
  addressId: string,
  couponCode?: string,
): Promise<CheckoutPreview> {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new CheckoutValidationError('Invalid shipping address.');
  }

  const cartItems = await getUserCart(userId);
  if (cartItems.length === 0) {
    throw new CheckoutValidationError('Your cart is empty.');
  }

  const lineItems: CheckoutLineItem[] = [];
  for (const item of cartItems) {
    let available = 0;
    if (item.variationId) {
      const v = await prisma.productVariation.findUnique({
        where: { id: item.variationId },
        select: { stockQty: true },
      });
      available = v?.stockQty ?? 0;
    } else {
      const vars = await prisma.productVariation.findMany({
        where: { productId: item.productId },
        select: { stockQty: true },
      });
      available = vars.reduce((sum, v) => sum + v.stockQty, 0);
    }

    if (item.quantity > available) {
      throw new InsufficientStockError(
        `Only ${available} unit(s) of "${item.productName}" available.`,
      );
    }

    lineItems.push({
      productId: item.productId,
      variationId: item.variationId,
      productName: item.productName,
      imageUrl: item.productImage,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
    });
  }

  const grouped: Record<string, SellerGroup> = {};
  let subtotal = 0;
  for (const li of lineItems) {
    subtotal += li.lineTotal;
    if (!grouped[li.sellerId]) {
      grouped[li.sellerId] = {
        sellerId: li.sellerId,
        sellerName: li.sellerName,
        subtotal: 0,
        items: [],
      };
    }
    grouped[li.sellerId].subtotal += li.lineTotal;
    grouped[li.sellerId].items.push(li);
  }

  const { discountAmount, coupon } = await calculateDiscount(subtotal, couponCode);
  const total = subtotal - discountAmount;

  const preview: CheckoutPreview = {
    items: lineItems,
    sellers: Object.values(grouped),
    subtotal,
    discountAmount,
    total,
  };

  if (coupon) {
    preview.coupon = {
      code: coupon.code,
      type: coupon.discountType,
      value: coupon.discountValue,
    };
  }

  return preview;
}

// ---------------------------------------------------------------------------
// Stripe Payment Intent creation
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  userId: string,
  addressId: string,
  couponCode?: string,
): Promise<{ clientSecret: string; paymentId: string }> {
  const preview = await validateCheckout(userId, addressId, couponCode);
  const amountInCents = Math.round(preview.total * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    metadata: {
      userId,
      addressId,
      couponCode: couponCode ?? '',
    },
  });

  const payment = await prisma.payment.create({
    data: {
      stripePaymentIntentId: paymentIntent.id,
      amount: preview.total,
      status: 'PENDING',
    },
  });

  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) throw new Error('Stripe PaymentIntent client_secret is missing');

  return { clientSecret, paymentId: payment.id };
}

// ---------------------------------------------------------------------------
// Checkout Completion (finalise after payment)
// ---------------------------------------------------------------------------

export async function completeCheckout(
  userId: string,
  stripePaymentIntentId: string,
): Promise<{ order: Order }> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId },
  });

  if (!payment || payment.status !== 'PENDING') {
    throw new PaymentNotFoundError();
  }

  let metadata;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    metadata = paymentIntent.metadata;
  } catch {
    throw new PaymentNotFoundError('Unable to verify payment');
  }

  const addressId = metadata.addressId;
  const couponCode = metadata.couponCode || undefined;
  const metadataUserId = metadata.userId;

  if (metadataUserId !== userId) throw new PaymentNotFoundError();

  const preview = await validateCheckout(userId, addressId, couponCode);

  const order = await prisma.$transaction(async (tx) => {
    for (const item of preview.items) {
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }
    }

    const order = await tx.order.create({
      data: {
        customerId: userId,
        status: 'CONFIRMED', // order is confirmed
        shippingAddressId: addressId,
        totalAmount: payment.amount,
      },
    });

    const orderItemsData = preview.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variationId: item.variationId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      priceAtTime: item.unitPrice,
      // NEW: every item starts as CONFIRMED because the order is already confirmed
      fulfillmentStatus: FulfillmentStatus.CONFIRMED,
    }));
    await tx.orderItem.createMany({ data: orderItemsData });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        orderId: order.id,
        status: 'SUCCEEDED',
      },
    });

    if (preview.coupon) {
      await tx.coupon.updateMany({
        where: { code: preview.coupon.code },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId } });

    return order;
  });

  // Send notifications (non‑blocking)
  const sellerIds = [...new Set(preview.items.map((item) => item.sellerId))];
  for (const sellerId of sellerIds) {
    sendSellerNewOrderNotification(sellerId, order.id).catch((err) =>
      console.error('Failed to notify seller:', err),
    );
  }
  sendCustomerOrderConfirmation(userId, order.id).catch((err) =>
    console.error('Failed to notify customer:', err),
  );

  return { order };
}
