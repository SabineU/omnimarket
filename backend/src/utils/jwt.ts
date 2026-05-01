// backend/src/utils/jwt.ts
// JWT utility functions – creates and verifies access and refresh tokens.
// Access tokens are short‑lived (15 min) and stored in memory on the client.
// Refresh tokens are longer‑lived (7 days) and stored in an httpOnly secure cookie.
// Refresh token rotation is implemented via a tokenVersion field on the User model.

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
