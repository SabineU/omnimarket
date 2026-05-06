// backend/src/middlewares/error-handler.ts
import type { Request, Response, NextFunction } from 'express';
import {
  UserExistsError,
  InvalidCredentialsError,
  TokenRefreshError,
  TokenExpiredError,
  TokenInvalidError,
} from '../services/auth.service.js';
import { SellerNotFoundError } from '../services/admin.service.js';
import { InsufficientStockError } from '../services/cart.service.js';
import { CouponValidationError } from '../services/coupon.service.js';
import { CheckoutValidationError } from '../services/checkout.service.js'; // <-- added

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UserExistsError) {
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof InvalidCredentialsError) {
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenRefreshError) {
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenExpiredError) {
    res.status(410).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenInvalidError) {
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof SellerNotFoundError) {
    res.status(404).json({ status: 'error', message: err.message });
  } else if (err instanceof InsufficientStockError) {
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof CouponValidationError) {
    res.status(400).json({ status: 'error', message: err.message });
  } else if (err instanceof CheckoutValidationError) {
    res.status(400).json({ status: 'error', message: err.message }); // <-- added
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
