// backend/src/app.ts
// Express application setup – separated from the server start for testability.
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

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

// 404 handler for unknown API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
