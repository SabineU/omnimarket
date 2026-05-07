// backend/src/routes/order.routes.ts
// Customer order routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/orders
router.get('/', orderController.listOrders);

// GET /api/orders/:id
router.get('/:id', orderController.getOrder);

export default router;
