/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/cart.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  mergeCart,
} from '../../services/cart.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      cartItem: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      // $transaction simply runs the callback with the mocked prisma
      $transaction: vi.fn((callback: any) => callback(prisma)),
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getUserCart
// ---------------------------------------------------------------------------
describe('getUserCart', () => {
  it('should return enriched cart items', async () => {
    // Raw Prisma items returned by findMany
    const rawItems = [
      {
        id: 'ci-1',
        productId: 'p1',
        variationId: null,
        quantity: 2,
        product: {
          name: 'Product A',
          basePrice: 100,
          sellerId: 's1',
          seller: { storeName: 'Store A' },
          images: [{ url: 'http://example.com/img.jpg' }],
        },
        variation: null,
      },
    ];
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(rawItems as any);

    const cart = await getUserCart('user-1');
    expect(cart).toHaveLength(1);
    expect(cart[0].productName).toBe('Product A');
    expect(cart[0].lineTotal).toBe(200); // 100 * 2
  });
});

// ---------------------------------------------------------------------------
// addCartItem
// ---------------------------------------------------------------------------
describe('addCartItem', () => {
  it('should create a new cart item when none exists', async () => {
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(null);
    const newItem = {
      id: 'new-id',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
      quantity: 1,
    };
    vi.mocked(prisma.cartItem.create).mockResolvedValue(newItem as any);

    const result = await addCartItem('user-1', {
      productId: 'p1',
      quantity: 1,
    });
    expect(result.quantity).toBe(1);
    expect(prisma.cartItem.create).toHaveBeenCalled();
  });

  it('should increment quantity if item already exists', async () => {
    const existing = {
      id: 'ci-1',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
      quantity: 3,
    };
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(existing as any);
    const updated = { ...existing, quantity: 5 };
    vi.mocked(prisma.cartItem.update).mockResolvedValue(updated as any);

    const result = await addCartItem('user-1', {
      productId: 'p1',
      quantity: 2,
    });
    expect(result.quantity).toBe(5); // 3 + 2
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
      data: { quantity: 5 },
    });
  });
});

// ---------------------------------------------------------------------------
// updateCartItemQuantity
// ---------------------------------------------------------------------------
describe('updateCartItemQuantity', () => {
  it('should update quantity if item belongs to user', async () => {
    const existing = { id: 'ci-1', userId: 'user-1', productId: 'p1' };
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue(existing as any);
    const updated = { ...existing, quantity: 4 };
    vi.mocked(prisma.cartItem.update).mockResolvedValue(updated as any);

    const result = await updateCartItemQuantity('ci-1', 'user-1', 4);
    expect(result.quantity).toBe(4);
  });

  it('should throw if item not found', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue(null);
    await expect(updateCartItemQuantity('bad-id', 'user-1', 1)).rejects.toThrow(
      'Cart item not found',
    );
  });

  it('should throw if item belongs to another user', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
      id: 'ci-1',
      userId: 'other',
    } as any);
    await expect(updateCartItemQuantity('ci-1', 'user-1', 1)).rejects.toThrow(
      'Cart item not found',
    );
  });
});

// ---------------------------------------------------------------------------
// removeCartItem
// ---------------------------------------------------------------------------
describe('removeCartItem', () => {
  it('should delete item if owned', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
      id: 'ci-1',
      userId: 'user-1',
    } as any);
    vi.mocked(prisma.cartItem.delete).mockResolvedValue({} as any);

    await expect(removeCartItem('ci-1', 'user-1')).resolves.toBeUndefined();
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
    });
  });

  it('should throw if not owned', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
      id: 'ci-1',
      userId: 'other',
    } as any);
    await expect(removeCartItem('ci-1', 'user-1')).rejects.toThrow('Cart item not found');
  });
});

// ---------------------------------------------------------------------------
// mergeCart
// ---------------------------------------------------------------------------
describe('mergeCart', () => {
  it('should merge new and existing items in a transaction', async () => {
    // Raw items that will be returned by findMany inside getUserCart
    const rawAfterMerge = [
      {
        id: 'ci-1',
        productId: 'p1',
        variationId: null,
        quantity: 3,
        product: {
          name: 'Product A',
          basePrice: 100,
          sellerId: 's1',
          seller: { storeName: 'Store A' },
          images: [{ url: 'http://example.com/img.jpg' }],
        },
        variation: null,
      },
      {
        id: 'ci-2',
        productId: 'p2',
        variationId: null,
        quantity: 2,
        product: {
          name: 'Product B',
          basePrice: 50,
          sellerId: 's2',
          seller: { storeName: 'Store B' },
          images: [],
        },
        variation: null,
      },
    ];

    // Expected enriched result after merge (matching the raw items above)
    const expectedCart = [
      {
        id: 'ci-1',
        productId: 'p1',
        variationId: null,
        quantity: 3,
        productName: 'Product A',
        productImage: 'http://example.com/img.jpg',
        price: 100,
        sellerId: 's1',
        sellerName: 'Store A',
        lineTotal: 300,
      },
      {
        id: 'ci-2',
        productId: 'p2',
        variationId: null,
        quantity: 2,
        productName: 'Product B',
        productImage: null,
        price: 50,
        sellerId: 's2',
        sellerName: 'Store B',
        lineTotal: 100,
      },
    ];

    // Mock findFirst: first call (p1) returns null (doesn't exist), second call (p2) returns existing item
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce({
      id: 'ci-2',
      userId: 'user-1',
      productId: 'p2',
      variationId: null,
      quantity: 1,
    } as any);

    // Mock the final getUserCart call (inside mergeCart) to return the raw items
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(rawAfterMerge as any);

    const items = [
      { productId: 'p1', quantity: 3 },
      { productId: 'p2', quantity: 1 },
    ];

    const result = await mergeCart('user-1', items);

    // Should have called findFirst twice (once per item)
    expect(prisma.cartItem.findFirst).toHaveBeenCalledTimes(2);
    // For the new item, create was called
    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', productId: 'p1', variationId: null, quantity: 3 },
    });
    // For the existing item, update was called to add quantity (1+1=2)
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-2' },
      data: { quantity: 2 },
    });
    // Result is the enriched cart from getUserCart
    expect(result).toEqual(expectedCart);
  });
});
