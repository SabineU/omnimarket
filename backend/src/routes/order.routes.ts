// backend/src/routes/order.routes.ts
// Customer order routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { requestReturnSchema } from '@omnimarket/shared';
import * as returnController from '../controllers/return.controller.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/orders
router.get('/', orderController.listOrders);

// GET /api/orders/:id
router.get('/:id', orderController.getOrder);

// PATCH /api/orders/:id/cancel
router.patch('/:id/cancel', orderController.cancelOrder);

// POST /api/orders/:id/request-return
router.patch('/:id/request-return', validate(requestReturnSchema), returnController.requestReturn);

export default router;
