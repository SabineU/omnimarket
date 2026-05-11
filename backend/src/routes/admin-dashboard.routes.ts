// backend/src/routes/admin-dashboard.routes.ts
// Admin dashboard route – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as dashboardController from '../controllers/admin-dashboard.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/dashboard/stats
router.get('/stats', dashboardController.getStats);

export default router;
