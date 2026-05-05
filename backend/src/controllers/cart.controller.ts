// backend/src/controllers/cart.controller.ts
// Handles HTTP requests for cart operations.
import type { Request, Response, NextFunction } from 'express';
import * as cartService from '../services/cart.service.js';

/** Extract the authenticated user's ID from req.user */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/** Helper to extract a single route parameter */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * GET /api/cart
 * Returns the authenticated user's cart.
 */
export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const items = await cartService.getUserCart(userId);
    res.status(200).json({
      status: 'success',
      data: { items },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cart/items
 * Add an item to the cart.
 */
export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const cartItem = await cartService.addCartItem(userId, req.body);
    res.status(201).json({
      status: 'success',
      data: { cartItem },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/cart/items/:itemId
 * Update the quantity of an existing cart item.
 */
export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const itemId = getParam(req, 'itemId');
    const { quantity } = req.body;
    const cartItem = await cartService.updateCartItemQuantity(itemId, userId, quantity);
    res.status(200).json({
      status: 'success',
      data: { cartItem },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/cart/items/:itemId
 * Remove an item from the cart.
 */
export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const itemId = getParam(req, 'itemId');
    await cartService.removeCartItem(itemId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cart/merge
 * Merge guest cart items into the authenticated user's cart.
 */
export async function mergeCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const { items } = req.body; // validated as an array of addToCartSchema
    const cart = await cartService.mergeCart(userId, items);
    res.status(200).json({
      status: 'success',
      data: { items: cart },
    });
  } catch (error) {
    next(error);
  }
}
