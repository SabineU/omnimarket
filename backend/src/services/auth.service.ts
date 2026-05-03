// backend/src/services/auth.service.ts
// Business logic for authentication (register, login, tokens).
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import type { User } from '@prisma/client';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

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

// ---------------------------------------------------------------------------
// Public Functions
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
