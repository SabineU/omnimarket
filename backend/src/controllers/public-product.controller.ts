// backend/src/controllers/public-product.controller.ts
// Handles HTTP requests for the public product listing.
import type { Request, Response, NextFunction } from 'express';
import * as publicProductService from '../services/public-product.service.js';

/**
 * GET /api/products
 * Query params:
 *   search, category, minPrice, maxPrice, sort, page, limit
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
