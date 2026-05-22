// backend/src/services/auth.service.ts
// Business logic for authentication (register, login, tokens, password reset).
// FIXED: registerUser now creates a SellerProfile automatically when
//        the user is a SELLER, so they can immediately create products.
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import type { User, UserRole } from '@prisma/client';
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
 *
 * If the role is SELLER, a corresponding SellerProfile is created
 * automatically so that the foreign‑key constraint on products is
 * satisfied immediately.  The profile starts unapproved — an admin
 * must approve it before the seller's products become visible.
 *
 * @param data.role – 'CUSTOMER' or 'SELLER' (uppercase, matching Prisma enum).
 *                    Defaults to 'CUSTOMER' if not provided.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}): Promise<AuthResult> {
  // 1. Check if email exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new UserExistsError('A user with this email already exists');
  }

  // 2. Hash the password (12 salt rounds)
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 3. Determine the role – only allow CUSTOMER or SELLER
  //    (never ADMIN via self‑registration)
  const role: UserRole = data.role === 'SELLER' ? 'SELLER' : 'CUSTOMER';

  // 4. Create user (tokenVersion defaults to 0)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role,
    },
  });

  // 5. If the user is a seller, create a SellerProfile automatically.
  //    This is required because the products table has a foreign key
  //    referencing seller_profiles.userId.
  //    The store name defaults to the user's name; an admin must approve
  //    the profile before the seller can go live.
  if (role === 'SELLER') {
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        storeName: user.name,
        description: null,
        isApproved: false,
      },
    });
  }

  // 6. Generate tokens
  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    id: user.id,
    tokenVersion: user.tokenVersion,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

/**
 * Log in an existing user.
 */
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
 */
export async function refreshUserToken(incomingRefreshToken: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new TokenRefreshError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new TokenRefreshError('User no longer exists');
  }

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
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const plainToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = await bcrypt.hash(plainToken, 10);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  return plainToken;
}

/**
 * Complete a password reset.
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
