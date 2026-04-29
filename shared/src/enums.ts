// shared/src/enums.ts
// Central place for all enum-like constants used across the app.
// We use string literal unions for better type safety and compatibility with Zod.

/**
 * User roles in the system.
 * CUSTOMER – regular buyer
 * SELLER   – merchant who lists products
 * ADMIN    – platform administrator
 */
export const UserRole = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Product listing statuses (lifecycle of a product from creation to removal).
 */
export const ProductStatus = {
  DRAFT: 'draft',
  PENDING: 'pending', // Waiting for admin approval
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * Order statuses – tracks the order from placement to delivery.
 */
export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Payment statuses.
 */
export const PaymentStatus = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
