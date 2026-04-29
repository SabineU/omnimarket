// shared/src/types.ts
// Pure TypeScript interfaces used across the app.
// These are NOT used for runtime validation – that's what the Zod schemas are for.

import type { UserRole, ProductStatus, OrderStatus, PaymentStatus } from './enums';

// ---- User & Auth ----
export interface BaseUser {
  id: string; // UUID v4
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: string; // ISO date string
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole; // Defaults to customer on the backend
}

// ---- Address ----
export interface Address {
  id: string;
  userId: string;
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

// ---- Category ----
export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[]; // For nested tree structure
}

// ---- Product ----
export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: ProductStatus;
  brand?: string;
  images: ProductImage[];
  variations: ProductVariation[];
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductVariation {
  id: string;
  productId: string;
  sku: string;
  size?: string;
  color?: string;
  priceModifier: number; // Added to basePrice for this variant
  stockQty: number;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
}

// ---- Cart ----
export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  // Populated by server:
  productName?: string;
  productImage?: string;
  price?: number;
  sellerId?: string;
}

// ---- Order ----
export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId: string;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  variationId?: string;
  sellerId: string;
  productName: string;
  quantity: number;
  priceAtTime: number;
}

// ---- Payment ----
export interface Payment {
  id: string;
  orderId: string;
  stripePaymentIntentId: string;
  amount: number;
  status: PaymentStatus;
}

// ---- Review ----
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}
