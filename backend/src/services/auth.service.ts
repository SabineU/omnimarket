// backend/src/services/auth.service.ts
// Business logic for authentication (register, login, tokens).
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import type { User } from '@prisma/client';

/**
 * Remove sensitive fields from a user object before sending to client.
 */
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

/**
 * Register a new user with email, password, and name.
 * Throws UserExistsError if the email is already taken.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller';
}): Promise<User> {
  // 1. Check if email is already in use
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new UserExistsError('A user with this email already exists');
  }

  // 2. Hash the password (12 salt rounds is a good balance between security and speed)
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 3. Create the user (role defaults to CUSTOMER if not provided)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role === 'seller' ? 'SELLER' : 'CUSTOMER',
    },
  });

  return user;
}

// Custom error class to be caught by the error‑handling middleware
export class UserExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserExistsError';
  }
}
