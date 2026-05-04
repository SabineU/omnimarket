// backend/src/services/user.service.ts
// Business logic for user profile management.
// Every function receives a userId so that we can identify the caller.
import { prisma } from '../db.js';
import type { User } from '@prisma/client';
import { sanitizeUser } from './auth.service.js';

/** Type of data the user is allowed to change on their profile */
export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string | null;
}

/**
 * Retrieve the full profile of the currently authenticated user.
 */
export async function getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

/**
 * Update the profile of the currently authenticated user.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<Omit<User, 'passwordHash'>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return sanitizeUser(updatedUser);
}

/**
 * Anonymize a user account (GDPR right to erasure).
 * - Removes all personal data (name, email, avatar) and replaces them with
 *   placeholders, freeing the original email for future use.
 * - Deletes the user’s addresses, cart items, and reviews.
 * - Increments tokenVersion so that all active sessions become invalid.
 * - The account can never be used again.
 *
 * This function runs inside a Prisma transaction to guarantee atomicity.
 */
export async function anonymizeUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
  // Use a transaction to ensure all operations succeed or fail together.
  return prisma.$transaction(async (tx) => {
    // 1. Delete personal data (addresses, cart, reviews)
    await tx.address.deleteMany({ where: { userId } });
    await tx.cartItem.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { customerId: userId } });

    // 2. Anonymize the user record
    const anonymizedUser = await tx.user.update({
      where: { id: userId },
      data: {
        // Replace email with a placeholder that can't be used to log in again.
        email: `deleted-${userId.slice(0, 8)}@omnimarket.local`,
        // Clear personal fields.
        name: 'Deleted User',
        avatarUrl: null,
        // Scramble the password hash so that even if someone restores the email,
        // they cannot authenticate.
        passwordHash: '',
        // Invalidate all existing tokens (access + refresh).
        tokenVersion: { increment: 1 },
      },
    });

    return sanitizeUser(anonymizedUser);
  });
}
