// backend/src/app.ts
// Express application setup – separated from the server start for testability.
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import addressRoutes from './routes/address.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminCategoryRoutes from './routes/adminCategory.routes.js';
import adminProductRoutes from './routes/adminProduct.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import publicProductRoutes from './routes/public-product.routes.js';
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

// Authentication routes
app.use('/api/auth', authRoutes);

// User profile routes
app.use('/api/users', userRoutes);

// Address routes
app.use('/api/users/me/addresses', addressRoutes);

// Seller profile routes
app.use('/api/seller', sellerRoutes);

// Seller product routes
app.use('/api/seller/products', productRoutes);

// Seller image upload
app.use('/api/seller/upload', uploadRoutes);

// Admin routes (seller approval)
app.use('/api/admin', adminRoutes);

// Admin category management
app.use('/api/admin/categories', adminCategoryRoutes);

// Admin product moderation
app.use('/api/admin/products', adminProductRoutes);

// Public category routes
app.use('/api/categories', categoryRoutes);

// Public product listing routes
app.use('/api/products', publicProductRoutes);

// ---------- Protected route examples ----------

app.get('/api/me', authenticate, (req: Request, res: Response) => {
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

app.get('/api/admin', authenticate, authorize('ADMIN'), (_req: Request, res: Response) => {
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
