// backend/src/routes/return.routes.ts
// Customer return/refund request route.
// Allows a customer to request a return for a delivered order.
import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js'; // <-- changed
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * POST /api/orders/:id/return
 *
 * Allows a customer to request a return for an order that has been delivered.
 * The order status is changed to RETURN_REQUESTED.
 *
 * Only the customer who owns the order can request a return.
 * Only orders with status DELIVERED are eligible.
 */
router.post('/orders/:id/return', authenticate, async (req: Request, res: Response) => {
  try {
    // Express types req.params.id as `string | string[]`.
    // We know it's a single string because the route pattern is :id,
    // so we use a type assertion to satisfy TypeScript.
    const id = req.params.id as string;
    const { reason } = req.body;
    const userId = req.user?.userId;

    // Validate that a reason was provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Please provide a reason for the return request.',
      });
      return;
    }

    // Find the order and verify ownership
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({
        status: 'error',
        message: 'Order not found.',
      });
      return;
    }

    // Verify the authenticated user is the order's customer
    if (order.customerId !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only request returns for your own orders.',
      });
      return;
    }

    // Only delivered orders can be returned
    if (order.status !== 'DELIVERED') {
      res.status(400).json({
        status: 'error',
        message: 'Only delivered orders are eligible for return.',
      });
      return;
    }

    // Update the order status to RETURN_REQUESTED.
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'RETURN_REQUESTED',
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the return reason (in production, store it in a dedicated table)
    console.log(`Return requested for order ${id} by user ${userId}. Reason: ${reason}`);

    res.status(200).json({
      status: 'success',
      data: {
        order: updatedOrder,
      },
    });
  } catch (err) {
    console.error('Return request error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error.',
    });
  }
});

export default router;
