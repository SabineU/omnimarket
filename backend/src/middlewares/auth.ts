// backend/src/middlewares/auth.ts
// Middleware that verifies the JWT access token sent in the Authorization header.
// On success, it attaches the decoded payload (userId and role) to req.user.
// On failure, it returns 401 Unauthorized.

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // 1. Extract the token from the Authorization header.
  //    The format is: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token present – the client must log in first.
    res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
    return;
  }

  // 2. Get the token part (after "Bearer ")
  const token = authHeader.split(' ')[1]; // e.g., "Bearer abc.def.gh" → "abc.def.gh"

  if (!token) {
    res.status(401).json({
      status: 'error',
      message: 'Token is missing from the Authorization header.',
    });
    return;
  }

  // 3. Verify the token using our utility (throws if invalid or expired)
  try {
    const payload = verifyAccessToken(token);

    // 4. Attach the decoded user info to the request object so downstream
    //    handlers and middleware can use it.
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    // 5. Call next() to pass control to the next middleware or route handler.
    next();
  } catch {
    // The token was malformed, expired, or had an invalid signature.
    // We do not use the error variable, so we omit it to avoid the lint warning.
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please log in again.',
    });
  }
}
