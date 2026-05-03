// backend/src/types/express.d.ts
// Augment the Express Request interface to include the authenticated user.
// This is a TypeScript-only file; it will be picked up by the compiler.

declare global {
  namespace Express {
    interface Request {
      // The user property is attached by our auth middleware.
      // It contains the minimum information we need for authorization.
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

// This file must be a module for the augmentation to work.
export {};
