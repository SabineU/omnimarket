// backend/src/services/cart.service.ts
// Business logic for the shopping cart.
// All functions require the authenticated user's ID.
import { prisma } from '../db.js';
import type { CartItem } from '@prisma/client';

/**
 * Enriched cart item returned to the client.
 * Includes product name, image URL, price, seller info, and line total.
 */
export interface CartItemWithDetails {
  id: string;
  productId: string;
  variationId: string | null;
  quantity: number;
  productName: string;
  productImage: string | null;
  price: number; // basePrice + variation priceModifier
  sellerId: string;
  sellerName: string;
  lineTotal: number; // price * quantity
}

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a user tries to add more items to the cart than are in stock.
 */
export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the available stock for a product (and optional variation).
 * If a variationId is provided, returns that variation's stockQty.
 * Otherwise, sums the stockQty of all variations. If the product has no
 * variations, returns 0 (stock is always managed at the variation level
 * in our schema).
 */
async function getAvailableStock(productId: string, variationId?: string): Promise<number> {
  if (variationId) {
    const variation = await prisma.productVariation.findUnique({
      where: { id: variationId },
      select: { stockQty: true },
    });
    return variation?.stockQty ?? 0;
  }

  // No variation specified – sum of all variations' stock
  const variations = await prisma.productVariation.findMany({
    where: { productId },
    select: { stockQty: true },
  });
  return variations.reduce((sum, v) => sum + v.stockQty, 0);
}

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Retrieve the authenticated user's entire cart,
 * with product, variation, and seller details.
 */
export async function getUserCart(userId: string): Promise<CartItemWithDetails[]> {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          name: true,
          basePrice: true,
          sellerId: true,
          seller: {
            select: { storeName: true },
          },
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      },
      variation: {
        select: {
          priceModifier: true,
        },
      },
    },
  });

  return items.map((item) => {
    const basePrice = Number(item.product.basePrice);
    const priceModifier = item.variation ? Number(item.variation.priceModifier) : 0;
    const price = basePrice + priceModifier;
    const productImage = item.product.images[0]?.url ?? null;

    return {
      id: item.id,
      productId: item.productId,
      variationId: item.variationId,
      quantity: item.quantity,
      productName: item.product.name,
      productImage,
      price,
      sellerId: item.product.sellerId,
      sellerName: item.product.seller.storeName,
      lineTotal: price * item.quantity,
    };
  });
}

/**
 * Add an item to the cart.
 * Validates that the requested quantity does not exceed available stock.
 * If the same product/variation already exists, the quantity is increased
 * (capped at 99), and the combined total is checked against stock.
 */
export async function addCartItem(
  userId: string,
  data: { productId: string; variationId?: string; quantity: number },
): Promise<CartItem> {
  // ---- Stock validation ----
  const available = await getAvailableStock(data.productId, data.variationId);
  if (available === 0) {
    throw new InsufficientStockError('This item is currently out of stock.');
  }

  const existing = await prisma.cartItem.findFirst({
    where: {
      userId,
      productId: data.productId,
      variationId: data.variationId ?? null,
    },
  });

  let totalQty = data.quantity;
  if (existing) {
    totalQty = Math.min(existing.quantity + data.quantity, 99);
  }

  if (totalQty > available) {
    throw new InsufficientStockError(`Only ${available} unit(s) available in stock.`);
  }

  // ---- Create / Update ----
  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: totalQty },
    });
  }

  return prisma.cartItem.create({
    data: {
      userId,
      productId: data.productId,
      variationId: data.variationId ?? null,
      quantity: data.quantity,
    },
  });
}

/**
 * Update the quantity of an existing cart item.
 * Validates that the new quantity does not exceed available stock.
 * Throws an error if the item does not belong to the user.
 */
export async function updateCartItemQuantity(
  itemId: string,
  userId: string,
  quantity: number,
): Promise<CartItem> {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) {
    throw new Error('Cart item not found');
  }

  // ---- Stock validation ----
  const available = await getAvailableStock(item.productId, item.variationId ?? undefined);
  if (quantity > available) {
    throw new InsufficientStockError(`Only ${available} unit(s) available in stock.`);
  }

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });
}

/**
 * Remove an item from the cart.
 * Only the owner of the cart item can delete it.
 */
export async function removeCartItem(itemId: string, userId: string): Promise<void> {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) {
    throw new Error('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
}

/**
 * Merge a list of guest cart items into the user's persistent cart.
 * For each item, stock is validated before merging.
 * The operation is performed within a transaction.
 * Returns the updated cart (enriched list).
 */
export async function mergeCart(
  userId: string,
  items: { productId: string; variationId?: string; quantity: number }[],
): Promise<CartItemWithDetails[]> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      // ---- Stock validation (inside transaction) ----
      let available: number;
      if (item.variationId) {
        const variation = await tx.productVariation.findUnique({
          where: { id: item.variationId },
          select: { stockQty: true },
        });
        available = variation?.stockQty ?? 0;
      } else {
        const variations = await tx.productVariation.findMany({
          where: { productId: item.productId },
          select: { stockQty: true },
        });
        available = variations.reduce((sum, v) => sum + v.stockQty, 0);
      }

      if (available === 0) {
        throw new InsufficientStockError('One of the items is out of stock.');
      }

      const existing = await tx.cartItem.findFirst({
        where: {
          userId,
          productId: item.productId,
          variationId: item.variationId ?? null,
        },
      });

      let totalQty = item.quantity;
      if (existing) {
        totalQty = Math.min(existing.quantity + item.quantity, 99);
      }

      if (totalQty > available) {
        throw new InsufficientStockError(
          `Only ${available} unit(s) available for one of the items.`,
        );
      }

      // Create or update
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: totalQty },
        });
      } else {
        await tx.cartItem.create({
          data: {
            userId,
            productId: item.productId,
            variationId: item.variationId ?? null,
            quantity: item.quantity,
          },
        });
      }
    }
  });

  // Return the final cart state
  return getUserCart(userId);
}
