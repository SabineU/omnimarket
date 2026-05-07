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
import { CheckoutValidationError, PaymentNotFoundError } from '../services/checkout.service.js';
import { OrderCancellationError } from '../services/order.service.js';
import Stripe from 'stripe';

/**
 * Global Express error handling middleware.
 * Maps known custom error classes to appropriate HTTP status codes.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // ---- Authentication & Authorisation errors ----
  if (err instanceof UserExistsError) {
    // Attempt to register an already registered email
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof InvalidCredentialsError) {
    // Wrong email or password during login
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenRefreshError) {
    // Invalid, expired, or revoked refresh token
    res.status(401).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenExpiredError) {
    // Password reset token was valid but has expired
    res.status(410).json({ status: 'error', message: err.message });
  } else if (err instanceof TokenInvalidError) {
    // Password reset token is invalid or already used
    res.status(401).json({ status: 'error', message: err.message });

    // ---- Admin / Seller errors ----
  } else if (err instanceof SellerNotFoundError) {
    // Seller profile not found (e.g., for approval)
    res.status(404).json({ status: 'error', message: err.message });

    // ---- Cart & Coupon errors ----
  } else if (err instanceof InsufficientStockError) {
    // Requested quantity exceeds available stock
    res.status(409).json({ status: 'error', message: err.message });
  } else if (err instanceof CouponValidationError) {
    // Coupon code invalid, expired, or limit reached
    res.status(400).json({ status: 'error', message: err.message });

    // ---- Checkout & Payment errors ----
  } else if (err instanceof CheckoutValidationError) {
    // Checkout pre‑validation failed (empty cart, bad address, etc.)
    res.status(400).json({ status: 'error', message: err.message });
  } else if (err instanceof PaymentNotFoundError) {
    // Payment intent not found, already processed, or does not belong to user
    res.status(400).json({ status: 'error', message: err.message });

    // ---- Order errors ----
  } else if (err instanceof OrderCancellationError) {
    res.status(400).json({ status: 'error', message: err.message });

    // ---- Stripe SDK errors ----
  } else if (err instanceof Stripe.errors.StripeError) {
    // Generic Stripe API error – return a payment‑required status
    res
      .status(402)
      .json({ status: 'error', message: 'Payment processing error. Please try again.' });

    // ---- Unknown / unexpected errors ----
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
