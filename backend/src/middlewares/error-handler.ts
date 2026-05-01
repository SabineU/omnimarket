// backend/src/middlewares/error-handler.ts
// Global Express error handling middleware.
import type { Request, Response, NextFunction } from 'express';
import { UserExistsError } from '../services/auth.service.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Handle known custom errors
  if (err instanceof UserExistsError) {
    res.status(409).json({ status: 'error', message: err.message });
  } else {
    // Log unexpected errors and return a generic 500
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
