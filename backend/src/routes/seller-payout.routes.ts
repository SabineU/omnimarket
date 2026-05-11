// backend/src/routes/seller-payout.routes.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { requestPayoutSchema } from '@omnimarket/shared';
import * as payoutController from '../controllers/payout.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

router.post('/', validate(requestPayoutSchema), payoutController.requestPayout);

export default router;
