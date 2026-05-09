// backend/src/routes/admin-order.routes.ts
// Admin order routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as adminOrderController from '../controllers/admin-order.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/orders
router.get('/', adminOrderController.listOrders);

// GET /api/admin/orders/:id
router.get('/:id', adminOrderController.getOrder);

export default router;
