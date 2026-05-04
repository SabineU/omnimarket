// shared/src/enums.ts
// Central place for all enum-like constants used across the app.
// We use string literal unions for better type safety and compatibility with Zod.
// The runtime values are UPPERCASE because they match the Prisma enum values
// stored in the PostgreSQL database.

/**
 * User roles in the system.
 * CUSTOMER – regular buyer
 * SELLER   – merchant who lists products
 * ADMIN    – platform administrator
 */
export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Product listing statuses (lifecycle of a product from creation to removal).
 */
export const ProductStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING', // Waiting for admin approval
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * Order statuses – tracks the order from placement to delivery / return.
 */
export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Payment statuses – linked to Stripe payment events.
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
