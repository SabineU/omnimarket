// backend/src/controllers/admin-order.controller.ts
// Handles HTTP requests for admin order endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as adminOrderService from '../services/admin-order.service.js';

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const options: adminOrderService.AdminOrderListOptions = {
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await adminOrderService.getAllOrders(options);
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

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = getParam(req, 'id');
    const order = await adminOrderService.getAdminOrderById(orderId);
    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
}
