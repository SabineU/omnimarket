// backend/src/middlewares/error-handler.ts
// Global Express error handling middleware.
import type { Request, Response, NextFunction } from 'express';
import {
  UserExistsError,
  InvalidCredentialsError,
  TokenRefreshError,
  TokenExpiredError,
  TokenInvalidError,
} from '../services/auth.service.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UserExistsError) {
    // Conflict – resource already exists
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof InvalidCredentialsError) {
    // Unauthorized – wrong email/password
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenRefreshError) {
    // Unauthorized – invalid or revoked refresh token
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenExpiredError) {
    // Gone – the reset token was valid but has expired
    res.status(410).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenInvalidError) {
    // Unauthorized – the reset token is wrong or already used
    res.status(401).json({ status: 'error', message: err.message });
  } else {
    // Unexpected – log and return generic 500
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
