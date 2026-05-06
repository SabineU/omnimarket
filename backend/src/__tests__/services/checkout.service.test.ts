/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/checkout.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCheckout,
  createPaymentIntent,
  CheckoutValidationError,
} from '../../services/checkout.service.js';
import { InsufficientStockError } from '../../services/cart.service.js';

// ---------------------------------------------------------------------------
// Mock the database module (address, productVariation, and payment)
// ---------------------------------------------------------------------------
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
      payment: {
        create: vi.fn(),
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Mock the cart service (getUserCart)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Mock the coupon service (calculateDiscount)
// ---------------------------------------------------------------------------
vi.mock('../../services/coupon.service.js', () => {
  return {
    calculateDiscount: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Mock the Stripe configuration module
// ---------------------------------------------------------------------------
vi.mock('../../config/stripe.js', () => {
  const mockCreate = vi.fn();
  return {
    stripe: {
      paymentIntents: {
        create: mockCreate,
      },
    },
  };
});

import { prisma } from '../../db.js';
import { getUserCart } from '../../services/cart.service.js';
import { calculateDiscount } from '../../services/coupon.service.js';
import { stripe } from '../../config/stripe.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// HELPERS – create reusable mock objects for shared test data
// =============================================================================

/** Build a mock cart item.  `lineTotal` is automatically `price * quantity` unless overridden. */
function mockCartItem(overrides: any = {}): any {
  const price = overrides.price ?? 50;
  const quantity = overrides.quantity ?? 2;
  const lineTotal = overrides.lineTotal ?? price * quantity;

  return {
    id: 'ci-1',
    productId: 'p1',
    variationId: null,
    quantity,
    productName: 'Test Item',
    productImage: 'http://example.com/img.jpg',
    price,
    sellerId: 'seller-1',
    sellerName: 'Store A',
    lineTotal,
    ...overrides,
  };
}

/** Build a mock address that belongs to the given userId */
function mockAddress(userId: string): any {
  return { id: 'addr-1', userId, street: '123 Main' };
}

/** Set up the stock mocks to return a given available quantity */
function mockStock(available: number): void {
  vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: available }] as any);
  vi.mocked(prisma.productVariation.findUnique).mockResolvedValue({
    stockQty: available,
  } as any);
}

// =============================================================================
// TESTS FOR validateCheckout (existing, unchanged)
// =============================================================================
describe('validateCheckout', () => {
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

// =============================================================================
// TESTS FOR createPaymentIntent (new)
// =============================================================================
describe('createPaymentIntent', () => {
  it('should create a PaymentIntent and a PENDING payment record', async () => {
    // Arrange: one item with price 50, quantity 1 => subtotal 50
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 1 })]);
    mockStock(5);
    vi.mocked(calculateDiscount).mockResolvedValue({ discountAmount: 0 });

    // Mock Stripe PaymentIntent creation
    const mockPaymentIntent = {
      id: 'pi_123',
      client_secret: 'secret_123',
    };
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue(mockPaymentIntent as any);

    // Mock the DB payment record
    const mockPaymentRecord = {
      id: 'pmt-1',
      stripePaymentIntentId: 'pi_123',
      amount: 50,
      status: 'PENDING',
    };
    vi.mocked(prisma.payment.create).mockResolvedValue(mockPaymentRecord as any);

    // Act
    const result = await createPaymentIntent('user-1', 'addr-1');

    // Assert
    expect(result.clientSecret).toBe('secret_123');
    expect(result.paymentId).toBe('pmt-1');

    // Verify Stripe was called with total in cents (50 * 100 = 5000)
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        metadata: {
          userId: 'user-1',
          addressId: 'addr-1',
          couponCode: '',
        },
      }),
    );

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        stripePaymentIntentId: 'pi_123',
        amount: 50,
        status: 'PENDING',
      },
    });
  });

  it('should pass coupon code to Stripe metadata', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 1 })]);
    mockStock(5);
    vi.mocked(calculateDiscount).mockResolvedValue({
      discountAmount: 5,
      coupon: {
        code: 'SAVE5',
        discountType: 'FIXED_AMOUNT',
        discountValue: 5,
        minCartAmount: null,
      },
    });

    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_456',
      client_secret: 'secret_456',
    } as any);
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pmt-2' } as any);

    await createPaymentIntent('user-1', 'addr-1', 'SAVE5');

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          couponCode: 'SAVE5',
        }),
      }),
    );
  });

  it('should throw if validation fails (e.g., empty cart)', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([]);

    await expect(createPaymentIntent('user-1', 'addr-1')).rejects.toThrow(CheckoutValidationError);
  });
});
