// backend/src/routes/invoice.routes.ts
// Invoice download route – only the order owner can download.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as invoiceController from '../controllers/invoice.controller.js';

const router = Router();

// All invoice routes require authentication
router.use(authenticate);

// GET /api/orders/:id/invoice – download the invoice PDF for a specific order
router.get('/orders/:id/invoice', invoiceController.getInvoice);

export default router;
