// backend/src/controllers/category.controller.ts
// Handles HTTP requests for category endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/category.service.js';

/** Helper to safely extract a single route parameter as a string */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * GET /api/categories
 * Returns the full category tree as JSON.
 */
export async function getTree(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tree = await categoryService.getCategoryTree();
    res.status(200).json({
      status: 'success',
      data: { categories: tree },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/categories/:slug
 * Returns a single category by its slug, including immediate children.
 */
export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Safely extract the slug parameter
    const slug = getParam(req, 'slug');
    const category = await categoryService.getCategoryBySlug(slug);
    res.status(200).json({
      status: 'success',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
}
