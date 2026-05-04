// backend/src/services/user.service.ts
// Business logic for user profile management.
// Every function receives a userId so that we can identify the caller.
import { prisma } from '../db.js';
import type { User } from '@prisma/client';

/**
 * Remove sensitive fields from a user object before sending it to the client.
 * We keep this function here as well (same as in auth.service) for
 * independence, or we could import the shared one.  For clarity we reuse
 * the auth service's sanitizeUser.
 */
import { sanitizeUser } from './auth.service.js';

/** Type of data the user is allowed to change on their profile */
export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string | null;
}

/**
 * Retrieve the full profile of the currently authenticated user.
 * Throws an error if the user does not exist (should not happen with a valid token).
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
 * Only the fields present in `data` will be changed.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<Omit<User, 'passwordHash'>> {
  // Ensure the user exists
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
