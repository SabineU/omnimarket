// backend/src/test-utils/setup.ts
// Test setup file – loads test environment variables and provides a
// database reset function that is used before each test suite.
import dotenv from 'dotenv';
import path from 'node:path';

// Load the test environment file BEFORE any other imports that use process.env
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Re-export the reset function from the existing utility
export { resetTestDatabase } from './reset-db.js';
