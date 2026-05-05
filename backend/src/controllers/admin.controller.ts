// backend/src/controllers/admin.controller.ts
// Handles HTTP requests for admin operations (seller approval, category CRUD).
import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';

/** Helper to safely extract a single route parameter as a string */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

// ---------------------------------------------------------------------------
// Seller Approval (existing)
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
    res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Category CRUD (new)
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/categories
 * Create a new category.
 */
export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await adminService.createCategory(req.body);
    res.status(201).json({
      status: 'success',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/categories/:id
 * Update an existing category.
 */
export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoryId = getParam(req, 'id');
    const category = await adminService.updateCategory(categoryId, req.body);
    res.status(200).json({
      status: 'success',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/categories/:id
 * Delete a category. Children become top‑level automatically.
 */
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
