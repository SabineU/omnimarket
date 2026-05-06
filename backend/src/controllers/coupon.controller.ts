// backend/src/controllers/coupon.controller.ts
// Handles HTTP requests for coupon validation.
import type { Request, Response, NextFunction } from 'express';
import * as couponService from '../services/coupon.service.js';

/**
 * POST /api/cart/validate-coupon
 * Body: { code: string }
 * Returns the coupon details if valid.
 */
export async function validateCoupon(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.body;
    const coupon = await couponService.validateCoupon(code);
    res.status(200).json({
      status: 'success',
      data: { coupon },
    });
  } catch (error) {
    next(error);
  }
}
