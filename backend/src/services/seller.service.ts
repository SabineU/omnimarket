// backend/src/services/seller.service.ts
// Business logic for managing a seller's own store profile.
import { prisma } from '../db.js';
import type { SellerProfile } from '@prisma/client';

/**
 * Retrieve the seller profile belonging to the given user.
 * Returns null if no profile exists yet (e.g., first login).
 */
export async function getSellerProfile(userId: string): Promise<SellerProfile | null> {
  return prisma.sellerProfile.findUnique({
    where: { userId },
  });
}

/**
 * Create or update the seller profile for the given user.
 * Uses Prisma's upsert so that the first call creates the profile and
 * subsequent calls update it.
 */
export async function upsertSellerProfile(
  userId: string,
  data: { storeName: string; description?: string; payoutDetails?: unknown },
): Promise<SellerProfile> {
  return prisma.sellerProfile.upsert({
    where: { userId },
    update: {
      storeName: data.storeName,
      description: data.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma expects JsonValue
      payoutDetails: data.payoutDetails as any,
    },
    create: {
      userId,
      storeName: data.storeName,
      description: data.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma expects JsonValue
      payoutDetails: data.payoutDetails as any,
      isApproved: false, // new profiles always require admin approval
    },
  });
}
