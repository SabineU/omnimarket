// backend/vitest.setup.ts
// Vitest setup file – runs before every test file in the same worker context.
// This ensures that the test environment variables are loaded before any
// application code is imported (e.g., the Express app).

import dotenv from 'dotenv';
import path from 'node:path';

// Load the .env.test file into process.env.
// By default, dotenv does NOT override variables already set,
// so any system‑level overrides will be respected.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });
