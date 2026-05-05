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
          sellerId: true, // directly get seller id
          seller: {
            select: {
              storeName: true, // only store name needed
            },
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
    // No orderBy – the generated type doesn’t support createdAt,
    // and ordering by creation date is not critical for the cart.
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
 * If the same product (and variation, if provided) already exists,
 * the quantity is increased by the new amount (up to 99).
 * Otherwise, a new cart item is created.
 */
export async function addCartItem(
  userId: string,
  data: { productId: string; variationId?: string; quantity: number },
): Promise<CartItem> {
  // Check if the item already exists
  const existing = await prisma.cartItem.findFirst({
    where: {
      userId,
      productId: data.productId,
      variationId: data.variationId ?? null,
    },
  });

  if (existing) {
    // Update quantity (clamped to max 99)
    const newQty = Math.min(existing.quantity + data.quantity, 99);
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  }

  // Create new cart item
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
 * For each item, if the same product/variation already exists, increment quantity;
 * otherwise create a new row. The operation is performed within a transaction.
 * Returns the updated cart (enriched list).
 */
export async function mergeCart(
  userId: string,
  items: { productId: string; variationId?: string; quantity: number }[],
): Promise<CartItemWithDetails[]> {
  // Run all inserts/updates in a transaction for atomicity
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const existing = await tx.cartItem.findFirst({
        where: {
          userId,
          productId: item.productId,
          variationId: item.variationId ?? null,
        },
      });

      if (existing) {
        // Increment quantity, clamped to max 99
        const newQty = Math.min(existing.quantity + item.quantity, 99);
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQty },
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

  // Return the final cart after merge
  return getUserCart(userId);
}
