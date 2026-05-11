// backend/src/services/coupon-admin.service.ts
// Business logic for admin coupon management.
import { prisma } from '../db.js';
import type { Coupon, Prisma } from '@prisma/client';

/** Shape for creating a coupon */
export interface CreateCouponData {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minCartAmount?: number;
  usageLimit?: number;
  expiresAt?: string; // ISO date
}

/** Shape for updating a coupon (all fields optional) */
export interface UpdateCouponData extends Partial<CreateCouponData> {}

/**
 * Create a new discount coupon.
 */
export async function createCoupon(data: CreateCouponData): Promise<Coupon> {
  return prisma.coupon.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minCartAmount: data.minCartAmount ?? null,
      usageLimit: data.usageLimit ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
}

/**
 * Return all coupons, optionally filtered by code search.
 */
export async function listCoupons(search?: string): Promise<Coupon[]> {
  const where: Prisma.CouponWhereInput = {};

  if (search) {
    where.code = { contains: search, mode: 'insensitive' };
  }

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update an existing coupon.  Only the fields present in `data` are changed.
 */
export async function updateCoupon(couponId: string, data: UpdateCouponData): Promise<Coupon> {
  // Ensure the coupon exists
  await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });

  // Build the update payload using the Prisma‑generated input type
  const payload: Prisma.CouponUpdateInput = { ...data };

  // Convert expiresAt to a Date object (or null) because Prisma expects that
  if (data.expiresAt !== undefined) {
    payload.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }

  return prisma.coupon.update({
    where: { id: couponId },
    data: payload,
  });
}

/**
 * Delete a coupon permanently.
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });
  await prisma.coupon.delete({ where: { id: couponId } });
}
