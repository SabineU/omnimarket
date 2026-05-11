// backend/src/routes/seller-ledger.routes.ts
// Seller ledger routes – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as ledgerController from '../controllers/seller-ledger.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

// GET /api/seller/ledger
router.get('/', ledgerController.getLedger);

// GET /api/seller/ledger/export/csv
router.get('/export/csv', ledgerController.exportCsv);

export default router;
