// backend/src/controllers/coupon-admin.controller.ts
// Handles HTTP requests for admin coupon management.
import type { Request, Response, NextFunction } from 'express';
import * as couponAdminService from '../services/coupon-admin.service.js';

/** Extract a single route parameter safely */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/**
 * POST /api/admin/coupons
 */
export async function createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupon = await couponAdminService.createCoupon(req.body);
    res.status(201).json({
      status: 'success',
      data: { coupon },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/coupons
 * Optional query: ?search=SAVE10
 */
export async function listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const coupons = await couponAdminService.listCoupons(search);
    res.status(200).json({
      status: 'success',
      data: { coupons },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/coupons/:id
 */
export async function updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const couponId = getParam(req, 'id');
    const coupon = await couponAdminService.updateCoupon(couponId, req.body);
    res.status(200).json({
      status: 'success',
      data: { coupon },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/coupons/:id
 */
export async function deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const couponId = getParam(req, 'id');
    await couponAdminService.deleteCoupon(couponId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
