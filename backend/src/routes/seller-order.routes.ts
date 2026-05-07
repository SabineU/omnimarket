// backend/src/routes/seller-order.routes.ts
// Seller order routes – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as sellerOrderController from '../controllers/seller-order.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

// GET /api/seller/orders
router.get('/', sellerOrderController.listOrders);

// GET /api/seller/orders/:id
router.get('/:id', sellerOrderController.getOrder);

export default router;
