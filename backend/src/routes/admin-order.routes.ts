// backend/src/routes/admin-order.routes.ts
// Admin order routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { processRefundSchema } from '@omnimarket/shared';
import * as adminOrderController from '../controllers/admin-order.controller.js';
import * as returnController from '../controllers/return.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/orders
router.get('/', adminOrderController.listOrders);

// GET /api/admin/orders/:id
router.get('/:id', adminOrderController.getOrder);

// Refund processing route: PATCH /api/admin/orders/:id/refund
router.patch('/:id/refund', validate(processRefundSchema), returnController.processRefund);

export default router;
