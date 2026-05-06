/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/checkout.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCheckout, CheckoutValidationError } from '../../services/checkout.service.js';
import { InsufficientStockError } from '../../services/cart.service.js';

// Mock the database module (for address and stock checks)
vi.mock('../../db.js', () => {
  return {
    prisma: {
      address: {
        findUnique: vi.fn(),
      },
      productVariation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

// Mock the cart service (getUserCart)
vi.mock('../../services/cart.service.js', () => {
  return {
    getUserCart: vi.fn(),
    InsufficientStockError: class extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'InsufficientStockError';
      }
    },
  };
});

// Mock the coupon service (calculateDiscount)
vi.mock('../../services/coupon.service.js', () => {
  return {
    calculateDiscount: vi.fn(),
  };
});

import { prisma } from '../../db.js';
import { getUserCart } from '../../services/cart.service.js';
import { calculateDiscount } from '../../services/coupon.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('validateCheckout', () => {
  // Helper: create a valid mock cart item
  function mockCartItem(overrides: any = {}): any {
    return {
      id: 'ci-1',
      productId: 'p1',
      variationId: null,
      quantity: 2,
      productName: 'Test Item',
      productImage: 'http://example.com/img.jpg',
      price: 50,
      sellerId: 'seller-1',
      sellerName: 'Store A',
      lineTotal: 100,
      ...overrides,
    };
  }

  // Helper: mock a valid address
  function mockAddress(userId: string): any {
    return { id: 'addr-1', userId, street: '123 Main' };
  }

  // Helper: mock stock (variation or sum)
  function mockStock(available: number): void {
    vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: available }] as any);
    vi.mocked(prisma.productVariation.findUnique).mockResolvedValue({
      stockQty: available,
    } as any);
  }

  it('should throw if address does not exist', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(null);

    await expect(validateCheckout('user-1', 'bad-addr')).rejects.toThrow(CheckoutValidationError);
  });

  it('should throw if address belongs to another user', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue({
      id: 'addr-1',
      userId: 'other',
    } as any);

    await expect(validateCheckout('user-1', 'addr-1')).rejects.toThrow(CheckoutValidationError);
  });

  it('should throw if cart is empty', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([]);

    await expect(validateCheckout('user-1', 'addr-1')).rejects.toThrow(CheckoutValidationError);
  });

  it('should throw InsufficientStockError if quantity exceeds stock', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 5 })]);
    mockStock(3); // only 3 in stock

    await expect(validateCheckout('user-1', 'addr-1')).rejects.toThrow(InsufficientStockError);
  });

  it('should return a correct preview with no coupon', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 2 })]);
    mockStock(10);
    vi.mocked(calculateDiscount).mockResolvedValue({ discountAmount: 0 });

    const preview = await validateCheckout('user-1', 'addr-1');

    expect(preview.subtotal).toBe(100);
    expect(preview.discountAmount).toBe(0);
    expect(preview.total).toBe(100);
    expect(preview.sellers).toHaveLength(1);
  });

  it('should apply a valid coupon and return discount', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 2 })]);
    mockStock(10);
    vi.mocked(calculateDiscount).mockResolvedValue({
      discountAmount: 20,
      coupon: {
        code: 'SAVE20',
        discountType: 'FIXED_AMOUNT',
        discountValue: 20,
        minCartAmount: null,
      },
    });

    const preview = await validateCheckout('user-1', 'addr-1', 'SAVE20');
    expect(preview.subtotal).toBe(100);
    expect(preview.discountAmount).toBe(20);
    expect(preview.total).toBe(80);
    expect(preview.coupon).toBeDefined();
    if (preview.coupon) {
      expect(preview.coupon.code).toBe('SAVE20');
    }
  });

  it('should group items by seller', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([
      mockCartItem({ id: 'a', sellerId: 's1', sellerName: 'Store A', lineTotal: 50 }),
      mockCartItem({ id: 'b', sellerId: 's2', sellerName: 'Store B', lineTotal: 70 }),
    ]);
    mockStock(10);
    vi.mocked(calculateDiscount).mockResolvedValue({ discountAmount: 0 });

    const preview = await validateCheckout('user-1', 'addr-1');
    expect(preview.sellers).toHaveLength(2);
    const s1 = preview.sellers.find((s) => s.sellerId === 's1');
    const s2 = preview.sellers.find((s) => s.sellerId === 's2');
    expect(s1?.subtotal).toBe(50);
    expect(s2?.subtotal).toBe(70);
  });
});
