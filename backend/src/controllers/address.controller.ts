// backend/src/controllers/address.controller.ts
// Handles HTTP requests for address management.
import type { Request, Response, NextFunction } from 'express';
import * as addressService from '../services/address.service.js';

/** Helper to get the authenticated user's ID */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Authentication required – req.user is missing');
  }
  return userId;
}

/** Helper to safely extract a single route parameter */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * GET /api/users/me/addresses
 * List all addresses of the authenticated user.
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const addresses = await addressService.getAddresses(userId);
    res.status(200).json({
      status: 'success',
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/me/addresses/:id
 * Get a single address belonging to the user.
 */
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const addressId = getParam(req, 'id');
    const address = await addressService.getAddressById(addressId, userId);
    res.status(200).json({
      status: 'success',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users/me/addresses
 * Create a new address for the user.
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const address = await addressService.createAddress(userId, req.body);
    res.status(201).json({
      status: 'success',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/me/addresses/:id
 * Update an existing address owned by the user.
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const addressId = getParam(req, 'id');
    const address = await addressService.updateAddress(addressId, userId, req.body);
    res.status(200).json({
      status: 'success',
      data: { address },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/me/addresses/:id
 * Remove an address belonging to the user.
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const addressId = getParam(req, 'id');
    await addressService.deleteAddress(addressId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
