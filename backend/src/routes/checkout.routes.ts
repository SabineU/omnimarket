// backend/src/routes/checkout.routes.ts
// Checkout routes – require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema } from '@omnimarket/shared';
import * as checkoutController from '../controllers/checkout.controller.js';

const router = Router();

// All checkout endpoints need authentication
router.use(authenticate);

// POST /api/checkout/validate
router.post('/validate', validate(checkoutSchema), checkoutController.validateCheckout);

export default router;
