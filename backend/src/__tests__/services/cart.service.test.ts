/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/cart.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  mergeCart,
  InsufficientStockError,
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
      productVariation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getUserCart (unchanged, but we need to mock raw items – already correct)
// ---------------------------------------------------------------------------
describe('getUserCart', () => {
  it('should return enriched cart items', async () => {
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
    expect(cart[0].lineTotal).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// addCartItem (updated with stock checks)
// ---------------------------------------------------------------------------
describe('addCartItem', () => {
  it('should create a new cart item when sufficient stock exists', async () => {
    // Stock check: variation not provided → sum all variations
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 50 }] as any);
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

  it('should throw InsufficientStockError if no stock available', async () => {
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([]); // 0 stock
    await expect(addCartItem('user-1', { productId: 'p1', quantity: 1 })).rejects.toThrow(
      InsufficientStockError,
    );
  });

  it('should increment quantity and check combined stock', async () => {
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 10 }] as any);
    const existing = {
      id: 'ci-1',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
      quantity: 8,
    };
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(existing as any);
    const updated = { ...existing, quantity: 10 }; // 8+2 capped at 99, but stock=10 ok
    vi.mocked(prisma.cartItem.update).mockResolvedValue(updated as any);

    const result = await addCartItem('user-1', {
      productId: 'p1',
      quantity: 2,
    });
    expect(result.quantity).toBe(10);
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
      data: { quantity: 10 },
    });
  });

  it('should throw InsufficientStockError if combined quantity exceeds stock', async () => {
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 5 }] as any);
    const existing = {
      id: 'ci-1',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
      quantity: 4,
    };
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(existing as any);

    await expect(
      addCartItem('user-1', { productId: 'p1', quantity: 2 }), // 4+2=6 > 5
    ).rejects.toThrow(InsufficientStockError);
  });
});

// ---------------------------------------------------------------------------
// updateCartItemQuantity (updated with stock check)
// ---------------------------------------------------------------------------
describe('updateCartItemQuantity', () => {
  it('should update quantity if item belongs to user and stock is sufficient', async () => {
    const existing = {
      id: 'ci-1',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
    };
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 10 }] as any);
    const updated = { ...existing, quantity: 4 };
    vi.mocked(prisma.cartItem.update).mockResolvedValue(updated as any);

    const result = await updateCartItemQuantity('ci-1', 'user-1', 4);
    expect(result.quantity).toBe(4);
  });

  it('should throw InsufficientStockError if quantity exceeds stock', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
      id: 'ci-1',
      userId: 'user-1',
      productId: 'p1',
      variationId: null,
    } as any);
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 2 }] as any);

    await expect(updateCartItemQuantity('ci-1', 'user-1', 5)).rejects.toThrow(
      InsufficientStockError,
    );
  });

  it('should throw if item not found', async () => {
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValue(null);
    await expect(updateCartItemQuantity('bad-id', 'user-1', 1)).rejects.toThrow(
      'Cart item not found',
    );
  });
});

// ---------------------------------------------------------------------------
// removeCartItem (unchanged)
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
// mergeCart (updated to include stock validation)
// ---------------------------------------------------------------------------
describe('mergeCart', () => {
  it('should merge new and existing items and validate stock', async () => {
    // Stock checks: p1 has stock 10, p2 has stock 5
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: 10 }] as any);
    vi.mocked(prisma.productVariation.findUnique).mockResolvedValue({
      stockQty: 5,
    } as any);

    // Existing item for p2
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce(null); // p1
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce({
      id: 'ci-2',
      userId: 'user-1',
      productId: 'p2',
      variationId: null,
      quantity: 1,
    } as any);

    // Raw cart after merge
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
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(rawAfterMerge as any);

    const items = [
      { productId: 'p1', quantity: 3 },
      { productId: 'p2', quantity: 1 },
    ];

    const result = await mergeCart('user-1', items);
    expect(result).toHaveLength(2);
    expect(result[1].quantity).toBe(2);
  });

  it('should throw InsufficientStockError if an item is out of stock', async () => {
    // Simulate p1 out of stock
    vi.mocked(prisma.productVariation.findMany).mockResolvedValueOnce([]);
    // The mock for findMany is specific to the first call, but the transaction
    // calls findMany for each item that has no variationId. We need to set up
    // two calls: first for p1 (out of stock), second for p2 (we won't reach).
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([]);

    await expect(mergeCart('user-1', [{ productId: 'p1', quantity: 1 }])).rejects.toThrow(
      InsufficientStockError,
    );
  });
});
