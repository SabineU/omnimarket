// backend/src/controllers/payment.controller.ts
// Handles HTTP requests for payment operations.
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
 * POST /api/checkout/create-payment-intent
 * Body: { addressId: string, couponCode?: string }
 * Returns the client secret needed to confirm the payment on the frontend.
 */
export async function createPaymentIntent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { addressId, couponCode } = req.body;
    const result = await checkoutService.createPaymentIntent(userId, addressId, couponCode);
    res.status(201).json({
      status: 'success',
      data: {
        clientSecret: result.clientSecret,
        paymentId: result.paymentId,
      },
    });
  } catch (error) {
    next(error);
  }
}
