// backend/src/utils/jwt.ts
// JWT utility functions – creates and verifies access and refresh tokens,
// plus impersonation tokens for admin debugging.
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// Types for the payloads we embed in tokens
export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

/** Payload for an impersonation token (admin debugging) */
export interface ImpersonationTokenPayload extends AccessTokenPayload {
  impersonatedBy: string; // admin user ID who initiated the impersonation
}

// Short‑lived access token (15 minutes)
export function generateAccessToken(user: { id: string; role: string }): string {
  const payload: AccessTokenPayload = {
    userId: user.id,
    role: user.role,
  };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

// Longer‑lived refresh token (7 days)
export function generateRefreshToken(user: { id: string; tokenVersion: number }): string {
  const payload: RefreshTokenPayload = {
    userId: user.id,
    tokenVersion: user.tokenVersion,
  };
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// Verify an access token; throws if invalid or expired
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// Verify a refresh token; throws if invalid or expired
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Generate a short‑lived impersonation token.
 * This token allows an admin to act as another user.
 * @param impersonatedUser – the target user to impersonate
 * @param adminUser – the admin who is requesting impersionation
 * @returns a JWT that contains userId, role, and impersonatedBy
 */
export function generateImpersonationToken(
  impersonatedUser: { id: string; role: string },
  adminUser: { id: string },
): string {
  const payload: ImpersonationTokenPayload = {
    userId: impersonatedUser.id,
    role: impersonatedUser.role,
    impersonatedBy: adminUser.id,
  };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
