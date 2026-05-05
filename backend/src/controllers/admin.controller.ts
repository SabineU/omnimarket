// backend/src/controllers/admin.controller.ts
// Handles HTTP requests for admin operations.
import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';

/** Helper to safely extract a single route parameter */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

// ---------------------------------------------------------------------------
// Seller Approval
// ---------------------------------------------------------------------------
export async function approveSeller(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getParam(req, 'userId');
    const { isApproved } = req.body;
    const profile = await adminService.approveSeller(userId, isApproved);
    res.status(200).json({ status: 'success', data: { profile } });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------
export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await adminService.createCategory(req.body);
    res.status(201).json({ status: 'success', data: { category } });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoryId = getParam(req, 'id');
    const category = await adminService.updateCategory(categoryId, req.body);
    res.status(200).json({ status: 'success', data: { category } });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoryId = getParam(req, 'id');
    await adminService.deleteCategory(categoryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Product Moderation (new)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/products
 * Query: ?status=PENDING (optional)
 */
export async function getAllProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const products = await adminService.getAllProducts({ status });
    res.status(200).json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/products/:id/status
 * Body: { status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'PENDING' }
 */
export async function updateProductStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const productId = getParam(req, 'id');
    const { status } = req.body;
    const product = await adminService.updateProductStatus(productId, status);
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
}
