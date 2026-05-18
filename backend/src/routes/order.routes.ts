// backend/src/routes/order.routes.ts
// Customer order routes – all require authentication.
import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// GET /api/orders – list all orders for the authenticated customer
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orders = await prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { take: 1, select: { url: true } },
              },
            },
            variation: {
              select: { sku: true, size: true, color: true },
            },
          },
        },
      },
    });

    res.json({ status: 'success', data: { orders } });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/orders/:id – single order detail
// Now includes `hasReviewed` on each item, based on the current user's reviews.
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    // Fetch the order with its items
    const order = await prisma.order.findFirst({
      where: { id, customerId: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { take: 1, select: { url: true } },
              },
            },
            variation: {
              select: { sku: true, size: true, color: true },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found' });
      return;
    }

    // Collect all product IDs from the order items
    const productIds = order.items.map((item) => item.productId);

    // Fetch all reviews by this user for those products
    const reviews = await prisma.review.findMany({
      where: {
        customerId: userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    // Build a Set of product IDs that have been reviewed
    const reviewedProductIdSet = new Set(reviews.map((r) => r.productId));

    // Attach `hasReviewed` to each item
    const itemsWithReviewStatus = order.items.map((item) => ({
      ...item,
      hasReviewed: reviewedProductIdSet.has(item.productId),
    }));

    // Return the order with the enriched items
    res.json({
      status: 'success',
      data: {
        order: {
          ...order,
          items: itemsWithReviewStatus,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch order' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/cancel – cancel an order
// ---------------------------------------------------------------------------
router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const order = await prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found' });
      return;
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      res.status(400).json({ status: 'error', message: 'Order cannot be cancelled' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: { id: true, status: true, totalAmount: true, createdAt: true, updatedAt: true },
    });

    res.json({ status: 'success', data: { order: updated } });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to cancel order' });
  }
});

export default router;
