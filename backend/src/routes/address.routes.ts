// backend/src/routes/address.routes.ts
// Address routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addressSchema, addressUpdateSchema } from '@omnimarket/shared';
import * as addressController from '../controllers/address.controller.js';

const router = Router();

// Protect every route in this router with the auth middleware
router.use(authenticate);

// GET /api/users/me/addresses – list all addresses
router.get('/', addressController.list);

// GET /api/users/me/addresses/:id – get a single address
router.get('/:id', addressController.getOne);

// POST /api/users/me/addresses – create a new address
router.post('/', validate(addressSchema), addressController.create);

// PUT /api/users/me/addresses/:id – update an address
router.put('/:id', validate(addressUpdateSchema), addressController.update);

// DELETE /api/users/me/addresses/:id – delete an address
router.delete('/:id', addressController.remove);

export default router;
