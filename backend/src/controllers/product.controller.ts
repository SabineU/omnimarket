// backend/src/controllers/product.controller.ts
// Handles HTTP requests for seller product management.
import type { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service.js';

/** Helper to get the authenticated seller's ID from req.user */
function getSellerId(req: Request): string {
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
 * POST /api/seller/products
 * Create a new product (with variations and images).
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const product = await productService.createProduct(sellerId, req.body);
    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/seller/products
 * List all products belonging to the authenticated seller.
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const products = await productService.getSellerProducts(sellerId);
    res.status(200).json({
      status: 'success',
      data: { products },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/seller/products/:id
 * Get a single product belonging to the authenticated seller.
 */
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const productId = getParam(req, 'id');
    const product = await productService.getProductById(productId, sellerId);
    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/seller/products/:id
 * Update a product (replace variations/images if provided).
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const productId = getParam(req, 'id');
    const product = await productService.updateProduct(productId, sellerId, req.body);
    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/seller/products/:id
 * Delete a product and its variations/images.
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const productId = getParam(req, 'id');
    await productService.deleteProduct(productId, sellerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
