// backend/src/controllers/order.controller.ts
// Handles HTTP requests for customer order endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service.js';

/** Extract the authenticated user's ID */
function getUserId(req: Request): string {
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
 * GET /api/orders
 * Optional query: ?status=CONFIRMED&page=1&limit=10
 */
export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const options: orderService.OrderListOptions = {
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await orderService.getUserOrders(userId, options);
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
 * GET /api/orders/:id
 */
export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = getParam(req, 'id');
    const order = await orderService.getOrderById(orderId, userId);
    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}
