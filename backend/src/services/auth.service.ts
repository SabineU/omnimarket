// backend/src/services/auth.service.ts
// Business logic for authentication (register, login, tokens, password reset).
import bcrypt from 'bcrypt';
import crypto from 'node:crypto'; // to generate cryptographically strong random tokens
import { prisma } from '../db.js';
import type { User } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

/** Successful authentication result returned to the controller */
export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

/** Remove sensitive fields before sending a user object to the client */
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

export class TokenExpiredError extends Error {
  constructor(message = 'Password reset token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class TokenInvalidError extends Error {
  constructor(message = 'Invalid or already used password reset token') {
    super(message);
    this.name = 'TokenInvalidError';
  }
}

// ---------------------------------------------------------------------------
// Public Functions – Registration, Login, Token Refresh
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 * Throws UserExistsError if the email is already taken.
 * Returns the new user (sanitized) along with access + refresh tokens.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller';
}): Promise<AuthResult> {
  // 1. Check if email exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new UserExistsError('A user with this email already exists');
  }

  // 2. Hash the password (12 salt rounds)
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 3. Create user (tokenVersion defaults to 0)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role === 'seller' ? 'SELLER' : 'CUSTOMER',
    },
  });

  // 4. Generate tokens
  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

/**
 * Log in an existing user.
 * Throws InvalidCredentialsError if email doesn't exist or password is wrong.
 * Returns the user (sanitized) along with access + refresh tokens.
 */
export async function loginUser(data: { email: string; password: string }): Promise<AuthResult> {
  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    // Use a generic message to avoid leaking whether the email exists
    throw new InvalidCredentialsError();
  }

  // 2. Compare provided password with the stored hash
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  // 3. Generate tokens (tokenVersion is used for refresh token rotation)
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

// ---------------------------------------------------------------------------
// Public Functions – Password Reset
// ---------------------------------------------------------------------------

/**
 * Initiate a password reset flow.
 * 1. Finds the user by email (silently returns success even if email doesn't exist
 *    – prevents email enumeration attacks).
 * 2. Deletes any existing reset tokens for that user.
 * 3. Generates a cryptographically strong random token.
 * 4. Stores its bcrypt hash in the database with a 1‑hour expiration.
 * 5. Returns the plain token (in production it would be emailed).
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  // 1. Find user – if no user exists, return null to signal "success but no email sent"
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null; // Pretend everything is fine to avoid leaking account existence
  }

  // 2. Remove any existing reset tokens for this user (one active at a time)
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // 3. Generate a 40‑byte random token encoded as hex (80 characters)
  const plainToken = crypto.randomBytes(40).toString('hex');

  // 4. Hash the token before storing (so a database dump doesn't reveal valid tokens)
  const tokenHash = await bcrypt.hash(plainToken, 10);

  // 5. Store the hashed token with an expiration of 1 hour from now
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000), // 1 hour in milliseconds
    },
  });

  // 6. Return the plain token – in production this would be sent via email
  return plainToken;
}

/**
 * Complete a password reset.
 * 1. Finds all valid (non‑expired) reset tokens for the user associated with the plain token.
 *    There is no direct lookup by token hash; we iterate and compare using bcrypt.
 * 2. If the token is valid and not expired, updates the user's password.
 * 3. Deletes the used token.
 */
export async function resetPassword(plainToken: string, newPassword: string): Promise<void> {
  // 1. Fetch all non‑expired reset tokens (typically just one per user, but we handle multiple)
  const activeTokens = await prisma.passwordResetToken.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  // 2. Find the token that matches the provided plain token
  let matchedToken: (typeof activeTokens)[number] | undefined;
  for (const record of activeTokens) {
    const isMatch = await bcrypt.compare(plainToken, record.tokenHash);
    if (isMatch) {
      matchedToken = record;
      break;
    }
  }

  if (!matchedToken) {
    throw new TokenInvalidError();
  }

  // 3. Check expiration again (safety belt)
  if (matchedToken.expiresAt < new Date()) {
    throw new TokenExpiredError();
  }

  // 4. Hash the new password and update the user
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: matchedToken.userId },
    data: { passwordHash },
  });

  // 5. Delete the used token from the database
  await prisma.passwordResetToken.delete({
    where: { id: matchedToken.id },
  });
}
