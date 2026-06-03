// backend/src/services/auth.service.ts
// Business logic for authentication (register, login, tokens, password reset).
// UPDATED: now sends real password reset emails via SendGrid instead of
//          only returning devToken.
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import type { User, UserRole } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from './email.service.js'; // <-- NEW

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

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new UserExistsError('A user with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const role: UserRole = data.role === 'SELLER' ? 'SELLER' : 'CUSTOMER';

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, name: data.name, role },
  });

  if (role === 'SELLER') {
    await prisma.sellerProfile.create({
      data: { userId: user.id, storeName: user.name, description: null, isApproved: false },
    });
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new InvalidCredentialsError();

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) throw new InvalidCredentialsError();

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshUserToken(incomingRefreshToken: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new TokenRefreshError();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new TokenRefreshError('User no longer exists');

  if (payload.tokenVersion !== user.tokenVersion) {
    throw new TokenRefreshError('Refresh token has been revoked');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });

  const accessToken = generateAccessToken({ id: updatedUser.id, role: updatedUser.role });
  const refreshToken = generateRefreshToken({
    id: updatedUser.id,
    tokenVersion: updatedUser.tokenVersion,
  });

  return { user: sanitizeUser(updatedUser), accessToken, refreshToken };
}

/**
 * Initiate a password reset flow.
 * Creates a reset token, saves it in the DB, and sends an email
 * to the user (if the email exists).
 * @param email – the user's email
 * @returns the plain reset token (for dev/test purposes) OR null if user not found
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Generate a cryptographically secure random token (80 hex chars)
  const plainToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = await bcrypt.hash(plainToken, 10);

  // Save the hashed token with a 1‑hour expiry
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000), // 1 hour
    },
  });

  // Send the real email (best‑effort – don't block the response)
  sendPasswordResetEmail(email, plainToken).catch((err) => {
    console.error('Failed to send password reset email:', err);
  });

  // Return the plain token so that in dev/test environments we can still log it
  return plainToken;
}

/**
 * Complete a password reset.
 * Verifies the plain token against the stored hash, updates the password,
 * and deletes the used token.
 */
export async function resetPassword(plainToken: string, newPassword: string): Promise<void> {
  const activeTokens = await prisma.passwordResetToken.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  let matchedToken: (typeof activeTokens)[number] | undefined;
  for (const record of activeTokens) {
    const isMatch = await bcrypt.compare(plainToken, record.tokenHash);
    if (isMatch) {
      matchedToken = record;
      break;
    }
  }

  if (!matchedToken) throw new TokenInvalidError();
  if (matchedToken.expiresAt < new Date()) throw new TokenExpiredError();

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: matchedToken.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.delete({ where: { id: matchedToken.id } });
}
