// backend/src/services/admin.service.ts
// Business logic for admin operations – seller approval, etc.
import { prisma } from '../db.js';
import type { SellerProfile } from '@prisma/client';

/** Custom error thrown when a seller profile is not found */
export class SellerNotFoundError extends Error {
  constructor(userId: string) {
    super(`Seller profile for user ${userId} not found`);
    this.name = 'SellerNotFoundError';
  }
}

/**
 * Approve or reject a seller by updating the isApproved field on their profile.
 * Throws SellerNotFoundError if the user does not exist or is not a seller (no profile).
 * This operation is idempotent – approving an already approved seller is allowed.
 */
export async function approveSeller(userId: string, isApproved: boolean): Promise<SellerProfile> {
  // 1. Check that the user exists and has a seller profile
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!sellerProfile) {
    throw new SellerNotFoundError(userId);
  }

  // (Optional) Verify the user role is SELLER – already implied by having a profile,
  // but we can double‑check for extra safety.
  if (sellerProfile.user.role !== 'SELLER') {
    throw new Error('User is not a seller');
  }

  // 2. Update the approval status
  return prisma.sellerProfile.update({
    where: { userId },
    data: { isApproved },
  });
}
