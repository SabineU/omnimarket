// backend/src/controllers/seller-order.controller.ts
// Handles HTTP requests for seller order endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as sellerOrderService from '../services/seller-order.service.js';

/** Extract authenticated user's ID (must be seller) */
function getSellerId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/** Extract a single route parameter safely */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/**
 * GET /api/seller/orders
 */
export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const options: sellerOrderService.SellerOrderListOptions = {
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await sellerOrderService.getSellerOrders(sellerId, options);
    res.status(200).json({
      status: 'success',
      data: {
        orders: result.orders,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/seller/orders/:id
 */
export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const orderId = getParam(req, 'id');
    const order = await sellerOrderService.getSellerOrderById(orderId, sellerId);
    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/seller/orders/:id/status
 * Body: { status: "CONFIRMED" | "SHIPPED" }
 */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const orderId = getParam(req, 'id');
    const { status } = req.body; // validated Zod schema
    const order = await sellerOrderService.updateOrderStatus(sellerId, orderId, status);
    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}
