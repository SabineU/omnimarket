// backend/src/middlewares/error-handler.ts
import type { Request, Response, NextFunction } from 'express';
import { UserExistsError, InvalidCredentialsError } from '../services/auth.service.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UserExistsError) {
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof InvalidCredentialsError) {
    res.status(401).json({ status: 'error', message: err.message });
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
