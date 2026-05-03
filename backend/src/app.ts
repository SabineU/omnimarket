// backend/src/app.ts
// Express application setup – separated from the server start for testability.
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import { authenticate } from './middlewares/auth.js';
import { authorize } from './middlewares/rbac.js';

// ---------------------------------------------------------------------------
// Create the Express app
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Global Middleware (runs on every request)
// ---------------------------------------------------------------------------

// Helmet adds security-related HTTP headers (X-Content-Type-Options, etc.)
app.use(helmet());

// CORS allows requests from other origins, like our React frontend
// In development, the frontend runs on port 5173.
app.use(
  cors({
    origin: ['http://localhost:5173'], // add production URL later
    credentials: true,
  }),
);

// Parse incoming JSON request bodies (Content-Type: application/json)
app.use(express.json());

// Morgan logs incoming requests to the console (useful for debugging)
app.use(morgan('dev'));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check – used by monitoring tools and load balancers
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes (login, register, refresh)
app.use('/api/auth', authRoutes);

// ---------- Protected route examples ----------

// Any authenticated user can access this endpoint
app.get('/api/me', authenticate, (req: Request, res: Response) => {
  // The authenticate middleware guarantees req.user exists, but we satisfy
  // the lint rule by checking explicitly (avoids non-null assertion).
  if (!req.user) {
    // This should never happen, but it's a safety net.
    res.status(500).json({ status: 'error', message: 'User not attached to request' });
    return;
  }

  res.json({
    status: 'success',
    data: {
      userId: req.user.userId,
      role: req.user.role,
    },
  });
});

// Only admin users can access this endpoint (role is uppercase as stored in DB)
app.get('/api/admin', authenticate, authorize('ADMIN'), (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Welcome, Admin!',
  });
});

// ---------------------------------------------------------------------------
// 404 handler for unknown API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must be the last middleware)
app.use(errorHandler);

export default app;
