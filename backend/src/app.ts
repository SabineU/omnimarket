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
import sellerOrderRoutes from './routes/seller-order.routes.js';
import sellerReviewRoutes from './routes/seller-review.routes.js';
import sellerDashboardRoutes from './routes/seller-dashboard.routes.js';
import sellerAnalyticsRoutes from './routes/seller-analytics.routes.js';
import sellerLedgerRoutes from './routes/seller-ledger.routes.js';
import sellerPayoutRoutes from './routes/seller-payout.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminCategoryRoutes from './routes/adminCategory.routes.js';
import adminProductRoutes from './routes/adminProduct.routes.js';
import adminOrderRoutes from './routes/admin-order.routes.js';
import adminPayoutRoutes from './routes/admin-payout.routes.js';
import adminDashboardRoutes from './routes/admin-dashboard.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import publicProductRoutes from './routes/public-product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import orderRoutes from './routes/order.routes.js';
import reviewRoutes from './routes/review.routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import { authenticate } from './middlewares/auth.js';
import { authorize } from './middlewares/rbac.js';

// ---------------------------------------------------------------------------
// Create the Express app
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Global Middleware – order matters!
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

// Morgan logs requests to the console
app.use(morgan('dev'));

// ---------------------------------------------------------------------------
// Stripe webhook route – must be BEFORE the JSON body parser!
// ---------------------------------------------------------------------------
app.use('/api/webhooks', webhookRoutes);

// Parse incoming JSON request bodies (for all other routes)
app.use(express.json());

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

// Seller order routes
app.use('/api/seller/orders', sellerOrderRoutes);

// Seller review dashboard routes
app.use('/api/seller/reviews', sellerReviewRoutes);

// Seller dashboard routes
app.use('/api/seller/dashboard', sellerDashboardRoutes);

// Seller analytics routes
app.use('/api/seller/analytics', sellerAnalyticsRoutes);

// Seller ledger routes
app.use('/api/seller/ledger', sellerLedgerRoutes);

// Seller payout routes
app.use('/api/seller/payouts', sellerPayoutRoutes);

// Seller image upload
app.use('/api/seller/upload', uploadRoutes);

// Admin routes (seller approval)
app.use('/api/admin', adminRoutes);

// Admin category management
app.use('/api/admin/categories', adminCategoryRoutes);

// Admin product moderation
app.use('/api/admin/products', adminProductRoutes);

// Admin order management
app.use('/api/admin/orders', adminOrderRoutes);

// Admin payout management
app.use('/api/admin/payouts', adminPayoutRoutes);

// Admin dashboard routes
app.use('/api/admin/dashboard', adminDashboardRoutes);

// Public category routes
app.use('/api/categories', categoryRoutes);

// Public product listing routes
app.use('/api/products', publicProductRoutes);

// Shopping cart routes (all require authentication)
app.use('/api/cart', cartRoutes);

// Coupon validation (mounted under /api/cart for logical grouping)
app.use('/api/cart', couponRoutes);

// Checkout validation and payment
app.use('/api/checkout', checkoutRoutes);
app.use('/api/checkout', paymentRoutes);

// Customer order routes
app.use('/api/orders', orderRoutes);

// Product review routes
app.use('/api/products', reviewRoutes);

// ---------- Protected route examples ----------

app.get('/api/me', authenticate, (req: Request, res: Response) => {
  const { userId, role } = req.user ?? {};
  if (!userId || !role) {
    res.status(500).json({ message: 'Internal error: user not attached to request' });
    return;
  }
  res.json({ status: 'success', data: { userId, role } });
});

app.get('/api/admin', authenticate, authorize('ADMIN'), (_req: Request, res: Response) => {
  res.json({ status: 'success', message: 'Welcome, Admin!' });
});

// ---------------------------------------------------------------------------
// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
