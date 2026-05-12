// backend/src/routes/system-settings.routes.ts
// System settings routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { systemSettingUpdateSchema } from '@omnimarket/shared';
import * as systemSettingsController from '../controllers/system-settings.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/settings
router.get('/', systemSettingsController.getAllSettings);

// PUT /api/admin/settings
router.put('/', validate(systemSettingUpdateSchema), systemSettingsController.updateSetting);

export default router;
