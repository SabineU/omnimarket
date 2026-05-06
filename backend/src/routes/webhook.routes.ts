// backend/src/routes/webhook.routes.ts
import { Router, raw } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

// Stripe requires the raw body for signature verification.
router.post('/stripe', raw({ type: 'application/json' }), webhookController.handleWebhook);

export default router;
