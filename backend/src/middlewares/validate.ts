// backend/src/middlewares/validate.ts
// Middleware that validates request body (or query/params) against a Zod schema.
import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export function validate(
  schema: ZodSchema,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        _res.status(400).json({ status: 'error', errors });
      } else {
        next(error);
      }
    }
  };
}
