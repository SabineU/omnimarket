// backend/src/controllers/public-product.controller.ts
// Handles HTTP requests for the public product listing and detail.
import type { Request, Response, NextFunction } from 'express';
import * as publicProductService from '../services/public-product.service.js';

/** Helper to safely extract a single route parameter */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * GET /api/products
 * Query params: search, category, minPrice, maxPrice, sort, page, limit
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const options: publicProductService.ProductListOptions = {
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sort: req.query.sort as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await publicProductService.getPublicProducts(options);

    res.status(200).json({
      status: 'success',
      data: {
        products: result.products,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:slug
 * Returns a single product by slug.
 */
export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = getParam(req, 'slug');
    const product = await publicProductService.getProductBySlug(slug);
    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}
