// backend/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import type { User } from '@prisma/client';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

// Response shape for successful registration/login
export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

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

  // 2. Hash password
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
  const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export class UserExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserExistsError';
  }
}
