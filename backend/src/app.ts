// backend/src/app.ts
// Express application setup – separated from the server start for testability.
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
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

// Helmet adds security-related HTTP headers
app.use(helmet());

// CORS allows requests from our React frontend
app.use(
  cors({
    origin: ['http://localhost:5173'], // add production URL later
    credentials: true,
  }),
);

// Parse incoming JSON request bodies
app.use(express.json());

// Morgan logs requests to the console
app.use(morgan('dev'));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes (login, register, refresh, forgot/reset password)
app.use('/api/auth', authRoutes);

// User profile routes (all require authentication)
app.use('/api/users', userRoutes);

// ---------- Protected route examples ----------

// Any authenticated user can access this endpoint
app.get('/api/me', authenticate, (req: Request, res: Response) => {
  // The authenticate middleware guarantees that req.user exists.
  // We extract the fields directly; if ever missing, this is a critical bug.
  const { userId, role } = req.user ?? {};
  if (!userId || !role) {
    res.status(500).json({ message: 'Internal error: user not attached to request' });
    return;
  }
  res.json({
    status: 'success',
    data: { userId, role },
  });
});

// Only admin users can access this endpoint
app.get('/api/admin', authenticate, authorize('admin'), (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Welcome, Admin!',
  });
});

// ---------------------------------------------------------------------------
// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
