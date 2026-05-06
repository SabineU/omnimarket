// backend/src/services/checkout.service.ts
// Pre‑checkout validation service.
// Validates cart, stock, address, and coupon, and returns a breakdown
// grouped by seller.  Also creates Stripe PaymentIntents.

import { prisma } from '../db.js';
import { getUserCart, InsufficientStockError } from './cart.service.js';
import { calculateDiscount } from './coupon.service.js';
import { stripe } from '../config/stripe.js';

/** A single line item in the checkout preview */
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

/** A seller group containing their items and subtotal */
export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  subtotal: number;
  items: CheckoutLineItem[];
}

/** Full checkout preview returned to the client */
export interface CheckoutPreview {
  items: CheckoutLineItem[];
  sellers: SellerGroup[];
  subtotal: number;
  discountAmount: number;
  coupon?: { code: string; type: string; value: number };
  shippingEstimate?: string; // placeholder; no shipping calculation yet
  total: number;
}

/** Custom error for validation failures */
export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

/**
 * Validate a checkout request without creating an order.
 * @param userId       authenticated user's ID
 * @param addressId    chosen shipping address ID
 * @param couponCode   optional coupon code
 * @returns full checkout preview
 */
export async function validateCheckout(
  userId: string,
  addressId: string,
  couponCode?: string,
): Promise<CheckoutPreview> {
  // 1. Verify the shipping address belongs to the user
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new CheckoutValidationError('Invalid shipping address.');
  }

  // 2. Get the user's cart (already enriched)
  const cartItems = await getUserCart(userId);
  if (cartItems.length === 0) {
    throw new CheckoutValidationError('Your cart is empty.');
  }

  // 3. Validate stock for every line item
  const lineItems: CheckoutLineItem[] = [];
  for (const item of cartItems) {
    // Determine available stock for this product/variation
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

    // Build the line item
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

  // 4. Group by seller
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

  // 5. Apply coupon discount (if any)
  const { discountAmount, coupon } = await calculateDiscount(subtotal, couponCode);

  // 6. Calculate total
  const total = subtotal - discountAmount;

  // 7. Build and return the preview
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

/**
 * Create a Stripe PaymentIntent and a pending Payment record.
 * Re‑validates the checkout to prevent amount tampering.
 * @param userId       authenticated user's ID
 * @param addressId    chosen shipping address ID
 * @param couponCode   optional coupon code
 * @returns The client secret (for the frontend) and the payment ID.
 */
export async function createPaymentIntent(
  userId: string,
  addressId: string,
  couponCode?: string,
): Promise<{ clientSecret: string; paymentId: string }> {
  // 1. Re‑validate the checkout to get the correct amount
  const preview = await validateCheckout(userId, addressId, couponCode);

  // 2. Stripe expects amounts in the smallest currency unit (cents)
  const amountInCents = Math.round(preview.total * 100);

  // 3. Create a PaymentIntent via Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    metadata: {
      userId,
      addressId,
      couponCode: couponCode ?? '',
    },
  });

  // 4. Save a PENDING payment record in our database
  //    Note: orderId will be linked after the order is created (Phase 7.3).
  const payment = await prisma.payment.create({
    data: {
      stripePaymentIntentId: paymentIntent.id,
      amount: preview.total,
      status: 'PENDING',
    },
  });

  // Stripe guarantees a client_secret, but we explicitly check to be safe
  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    throw new Error('Stripe PaymentIntent client_secret is missing');
  }

  return {
    clientSecret,
    paymentId: payment.id,
  };
}
