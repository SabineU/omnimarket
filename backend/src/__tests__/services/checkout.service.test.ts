/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/checkout.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCheckout,
  createPaymentIntent,
  completeCheckout,
  CheckoutValidationError,
  PaymentNotFoundError,
} from '../../services/checkout.service.js';
import { InsufficientStockError } from '../../services/cart.service.js';

// ---------------------------------------------------------------------------
// Mock the database module – now includes all models used by completeCheckout
// ---------------------------------------------------------------------------
vi.mock('../../db.js', () => {
  const mockPrisma = {
    address: { findUnique: vi.fn() },
    productVariation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    order: { create: vi.fn() },
    orderItem: { createMany: vi.fn() },
    coupon: { updateMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn((callback: any) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

// ---------------------------------------------------------------------------
// Mock the cart service (getUserCart)
// ---------------------------------------------------------------------------
vi.mock('../../services/cart.service.js', () => ({
  getUserCart: vi.fn(),
  InsufficientStockError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'InsufficientStockError';
    }
  },
}));

// ---------------------------------------------------------------------------
// Mock the coupon service (calculateDiscount)
// ---------------------------------------------------------------------------
vi.mock('../../services/coupon.service.js', () => ({
  calculateDiscount: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock the Stripe configuration module
// ---------------------------------------------------------------------------
vi.mock('../../config/stripe.js', () => {
  const mockCreate = vi.fn();
  const mockRetrieve = vi.fn();
  return {
    stripe: {
      paymentIntents: {
        create: mockCreate,
        retrieve: mockRetrieve,
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
// HELPERS
// =============================================================================

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

function mockAddress(userId: string): any {
  return { id: 'addr-1', userId, street: '123 Main' };
}

function mockStock(available: number): void {
  vi.mocked(prisma.productVariation.findMany).mockResolvedValue([{ stockQty: available }] as any);
  vi.mocked(prisma.productVariation.findUnique).mockResolvedValue({ stockQty: available } as any);
}

// =============================================================================
// validateCheckout (unchanged)
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
    mockStock(3);
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
// createPaymentIntent (unchanged)
// =============================================================================
describe('createPaymentIntent', () => {
  it('should create a PaymentIntent and a PENDING payment record', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 1 })]);
    mockStock(5);
    vi.mocked(calculateDiscount).mockResolvedValue({ discountAmount: 0 });

    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
      id: 'pi_123',
      client_secret: 'secret_123',
    } as any);
    vi.mocked(prisma.payment.create).mockResolvedValue({
      id: 'pmt-1',
      stripePaymentIntentId: 'pi_123',
      amount: 50,
      status: 'PENDING',
    } as any);

    const result = await createPaymentIntent('user-1', 'addr-1');
    expect(result.clientSecret).toBe('secret_123');
    expect(result.paymentId).toBe('pmt-1');

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        metadata: { userId: 'user-1', addressId: 'addr-1', couponCode: '' },
      }),
    );
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: { stripePaymentIntentId: 'pi_123', amount: 50, status: 'PENDING' },
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
      expect.objectContaining({ metadata: expect.objectContaining({ couponCode: 'SAVE5' }) }),
    );
  });

  it('should throw if validation fails (e.g., empty cart)', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([]);
    await expect(createPaymentIntent('user-1', 'addr-1')).rejects.toThrow(CheckoutValidationError);
  });
});

// =============================================================================
// completeCheckout (NEW)
// =============================================================================
describe('completeCheckout', () => {
  function mockPaymentAndIntent(
    paymentIntentId: string,
    metadata: { userId: string; addressId: string; couponCode?: string },
  ): void {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pmt-1',
      orderId: null,
      stripePaymentIntentId: paymentIntentId,
      amount: 100,
      status: 'PENDING',
    } as any);

    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: paymentIntentId,
      metadata,
    } as any);
  }

  it('should finalize the order and return it', async () => {
    const metadata = { userId: 'user-1', addressId: 'addr-1', couponCode: 'SAVE10' };
    mockPaymentAndIntent('pi_123', metadata);

    vi.mocked(prisma.address.findUnique).mockResolvedValue(mockAddress('user-1') as any);
    vi.mocked(getUserCart).mockResolvedValue([mockCartItem({ quantity: 1, variationId: 'var-1' })]);
    mockStock(10);
    vi.mocked(calculateDiscount).mockResolvedValue({
      discountAmount: 10,
      coupon: {
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: null,
      },
    });

    vi.mocked(prisma.productVariation.update).mockResolvedValue({} as any);
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'order-1',
      customerId: 'user-1',
      status: 'CONFIRMED',
      totalAmount: 100,
    } as any);
    vi.mocked(prisma.orderItem.createMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.cartItem.deleteMany).mockResolvedValue({ count: 1 } as any);

    const result = await completeCheckout('user-1', 'pi_123');
    expect(result.order).toBeDefined();
    expect(result.order.id).toBe('order-1');

    expect(prisma.productVariation.update).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      data: { stockQty: { decrement: 1 } },
    });
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: {
        customerId: 'user-1',
        status: 'CONFIRMED',
        shippingAddressId: 'addr-1',
        totalAmount: 100,
      },
    });
    expect(prisma.orderItem.createMany).toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pmt-1' },
      data: { orderId: 'order-1', status: 'SUCCEEDED' },
    });
    expect(prisma.coupon.updateMany).toHaveBeenCalledWith({
      where: { code: 'SAVE10' },
      data: { usedCount: { increment: 1 } },
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('should throw PaymentNotFoundError if payment status is not PENDING', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pmt-2',
      stripePaymentIntentId: 'pi_used',
      status: 'SUCCEEDED',
    } as any);
    await expect(completeCheckout('user-1', 'pi_used')).rejects.toThrow(PaymentNotFoundError);
  });

  it('should throw PaymentNotFoundError if payment is not found', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
    await expect(completeCheckout('user-1', 'pi_missing')).rejects.toThrow(PaymentNotFoundError);
  });

  it('should throw PaymentNotFoundError if Stripe retrieval fails', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pmt-3',
      stripePaymentIntentId: 'pi_fail',
      status: 'PENDING',
    } as any);
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(new Error('Stripe error'));
    await expect(completeCheckout('user-1', 'pi_fail')).rejects.toThrow(PaymentNotFoundError);
  });

  it('should throw if metadata userId does not match the requesting user', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pmt-4',
      stripePaymentIntentId: 'pi_wrong',
      status: 'PENDING',
    } as any);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: 'pi_wrong',
      metadata: { userId: 'other-user', addressId: 'addr-1' },
    } as any);
    await expect(completeCheckout('user-1', 'pi_wrong')).rejects.toThrow(PaymentNotFoundError);
  });
});
