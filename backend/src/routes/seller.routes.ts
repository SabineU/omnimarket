// backend/src/routes/seller.routes.ts
// Seller profile routes – restricted to users with the SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { sellerProfileSchema } from '@omnimarket/shared';
import * as sellerController from '../controllers/seller.controller.js';

const router = Router();

// Every route in this router requires authentication and the SELLER role
router.use(authenticate);
router.use(authorize('seller'));

// GET /api/seller/profile
router.get('/profile', sellerController.getProfile);

// PUT /api/seller/profile – validate the body with the shared schema
router.put('/profile', validate(sellerProfileSchema), sellerController.upsertProfile);

export default router;
