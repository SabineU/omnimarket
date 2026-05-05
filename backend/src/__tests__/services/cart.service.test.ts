/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/cart.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
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
    const mockItems = [
      {
        id: 'ci-1',
        productId: 'p1',
        variationId: null,
        quantity: 2,
        product: {
          name: 'Product A',
          basePrice: 100,
          seller: { id: 's1', storeName: 'Store A' },
          images: [{ url: 'http://example.com/img.jpg' }],
        },
        variation: null,
      },
    ];
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(mockItems as any);

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
