// backend/src/services/impersonation.service.ts
// Business logic for admin impersonation.
import { prisma } from '../db.js';
import { generateImpersonationToken } from '../utils/jwt.js';

/** Custom error */
export class ImpersonationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpersonationError';
  }
}

/**
 * Generate an impersonation token for a given user.
 * The requesting admin must exist (verified by auth middleware).
 * @param targetUserId – the user ID to impersonate
 * @param adminUserId  – the admin requesting impersionation (from req.user)
 * @returns an access token that represents the target user
 */
export async function impersonateUser(targetUserId: string, adminUserId: string): Promise<string> {
  // 1. Fetch the target user (must exist and be active)
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, isActive: true },
  });

  if (!targetUser) {
    throw new ImpersonationError('Target user not found.');
  }

  if (!targetUser.isActive) {
    throw new ImpersonationError('Cannot impersonate a deactivated user.');
  }

  // 2. Generate a short‑lived impersonation token
  const token = generateImpersonationToken(
    { id: targetUser.id, role: targetUser.role },
    { id: adminUserId },
  );

  return token;
}
