// backend/src/routes/seller-dashboard.routes.ts
// Seller dashboard route – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as dashboardController from '../controllers/seller-dashboard.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

// GET /api/seller/dashboard
router.get('/', dashboardController.getDashboard);

export default router;
