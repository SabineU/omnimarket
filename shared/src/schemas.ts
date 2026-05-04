// shared/src/schemas.ts
// Zod schemas for runtime validation. These are the single source of truth for
// validation rules shared between API (request body) and frontend (form validation).

import { z } from 'zod';
import { UserRole } from './enums';

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum([UserRole.CUSTOMER, UserRole.SELLER]).optional().default(UserRole.CUSTOMER),
});

// ---- Token Refresh ----
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ---- Password Reset ----
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// ---- User Profile ----
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  avatarUrl: z.string().url().nullable().optional(), // nullable to allow clearing the avatar
});

// ---- Seller Profile ----
export const sellerProfileSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters'),
  description: z.string().optional(),
  payoutDetails: z.any().optional(), // JSON object for bank details; kept flexible
});

// ---- Address ----
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  isDefault: z.boolean().default(false),
});

// Partial schema for updating an address – every field is optional
export const addressUpdateSchema = addressSchema.partial();

// ---- Product ----
export const productCreateSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().uuid(),
  basePrice: z.number().positive('Price must be positive'),
  brand: z.string().optional(),
  variations: z
    .array(
      z.object({
        sku: z.string().min(1),
        size: z.string().optional(),
        color: z.string().optional(),
        priceModifier: z.number().default(0),
        stockQty: z.number().int().min(0),
      }),
    )
    .optional()
    .default([]),
});

// ---- Cart ----
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variationId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(99),
});

// ---- Order (checkout) ----
export const checkoutSchema = z.object({
  addressId: z.string().uuid(),
  couponCode: z.string().optional(),
  // paymentMethodId will be provided after Stripe client-side creation
});

// ---- Review ----
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
