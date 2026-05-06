// backend/src/controllers/checkout.controller.ts
// Handles HTTP requests for checkout validation and completion.
import type { Request, Response, NextFunction } from 'express';
import * as checkoutService from '../services/checkout.service.js';

/** Helper to extract authenticated user's ID */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/**
 * POST /api/checkout/validate
 * Body: { addressId (string), couponCode? (string) }
 */
export async function validateCheckout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { addressId, couponCode } = req.body;
    const preview = await checkoutService.validateCheckout(userId, addressId, couponCode);
    res.status(200).json({
      status: 'success',
      data: preview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkout/complete
 * Body: { stripePaymentIntentId (string) }
 */
export async function completeCheckout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { stripePaymentIntentId } = req.body;
    const { order } = await checkoutService.completeCheckout(userId, stripePaymentIntentId);
    res.status(201).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}
