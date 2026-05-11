// backend/src/routes/admin-payout.routes.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { processPayoutSchema } from '@omnimarket/shared';
import * as payoutController from '../controllers/payout.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', payoutController.listPayouts);
router.patch('/:id', validate(processPayoutSchema), payoutController.processPayout);

export default router;
