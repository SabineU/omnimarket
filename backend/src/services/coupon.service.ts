// backend/src/services/coupon.service.ts
// Business logic for coupon validation.
// A coupon can be validated before checkout to show the user the discount.
import { prisma } from '../db.js';

/**
 * Public information returned after a successful coupon validation.
 * Does not include internal IDs or usage counts.
 */
export interface ValidCoupon {
  code: string;
  discountType: string; // 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number;
  minCartAmount: number | null; // null means no minimum
}

// Custom error for invalid coupons
export class CouponValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouponValidationError';
  }
}

/**
 * Validate a coupon code.
 * Returns the discount details if the coupon is valid.
 * Throws CouponValidationError with an appropriate message otherwise.
 */
export async function validateCoupon(code: string): Promise<ValidCoupon> {
  // 1. Fetch the coupon by code
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon) {
    throw new CouponValidationError('Invalid coupon code.');
  }

  // 2. Check expiration
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new CouponValidationError('This coupon has expired.');
  }

  // 3. Check usage limit (null = unlimited)
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponValidationError('This coupon is no longer valid.');
  }

  // 4. Return public info
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    minCartAmount: coupon.minCartAmount ? Number(coupon.minCartAmount) : null,
  };
}
