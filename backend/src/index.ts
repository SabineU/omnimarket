/*
// backend/src/index.ts
// Entry point – starts the Express server with validated configuration.
import { config } from './config.js';
import app from './app.js';

const PORT = config.PORT; // Already validated, so it's always a number

app.listen(PORT, () => {
  console.log(`🚀 OmniMarket API running on http://localhost:${PORT}`);
});*/

// backend/src/index.ts
import 'dotenv/config';
import app from './app.js';
import { prisma } from './db.js';

const PORT = process.env.PORT || 5000;

// Start your Express app
app.listen(PORT, () => {
  console.log(`🚀 OmniMarket API running on http://localhost:${PORT}`);
});

// Test the database connection on startup
prisma
  .$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((e: Error) => console.error('❌ Database connection failed:', e.message));

// Optional: Gracefully close the connection on app termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
