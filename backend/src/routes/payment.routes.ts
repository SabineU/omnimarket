// backend/src/routes/payment.routes.ts
// Payment routes – require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema, completeCheckoutSchema } from '@omnimarket/shared';
import * as paymentController from '../controllers/payment.controller.js';
import * as checkoutController from '../controllers/checkout.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/checkout/create-payment-intent
router.post(
  '/create-payment-intent',
  validate(checkoutSchema),
  paymentController.createPaymentIntent,
);

// POST /api/checkout/complete
router.post('/complete', validate(completeCheckoutSchema), checkoutController.completeCheckout);

export default router;
