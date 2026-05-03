// backend/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import type { User } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

export class UserExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class TokenRefreshError extends Error {
  constructor(message = 'Invalid or expired refresh token') {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller';
}): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new UserExistsError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role === 'seller' ? 'SELLER' : 'CUSTOMER',
    },
  });

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

/**
 * Refresh an access token using a valid refresh token (rotation).
 * - Verifies the refresh token signature and expiration.
 * - Checks that the tokenVersion in the payload matches the user's current version.
 * - Increments the user's tokenVersion to invalidate all old refresh tokens.
 * - Returns a NEW access token and a NEW refresh token.
 */
export async function refreshUserToken(incomingRefreshToken: string): Promise<AuthResult> {
  // 1. Decode and verify the refresh token (throws if invalid)
  let payload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new TokenRefreshError('Invalid or expired refresh token');
  }

  // 2. Fetch the user from the database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  if (!user) {
    throw new TokenRefreshError('User no longer exists');
  }

  // 3. Check token version – if it doesn't match, the token has already been rotated
  if (payload.tokenVersion !== user.tokenVersion) {
    // Possible token reuse detected – we could also revoke all tokens here
    throw new TokenRefreshError('Refresh token has been revoked');
  }

  // 4. Rotate: increment the token version so the old token becomes invalid
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });

  // 5. Generate new token pair
  const accessToken = generateAccessToken({
    id: updatedUser.id,
    role: updatedUser.role,
  });
  const refreshToken = generateRefreshToken({
    id: updatedUser.id,
    tokenVersion: updatedUser.tokenVersion,
  });

  return { user: sanitizeUser(updatedUser), accessToken, refreshToken };
}
