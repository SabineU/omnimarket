// backend/src/routes/seller-analytics.routes.ts
// Seller analytics routes – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as analyticsController from '../controllers/seller-analytics.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

// GET /api/seller/analytics/sales
router.get('/sales', analyticsController.getSalesAnalytics);

export default router;
