// backend/vitest.config.ts
// Vitest configuration for the backend workspace.
// Tests are located in src/__tests__ and use the .test.ts extension.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Where Vitest looks for test files
    include: ['src/__tests__/**/*.test.ts'],

    // Environment – 'node' means no DOM, just pure server‑side logic
    environment: 'node',

    // Make Vitest automatically mock certain modules if needed (we'll mock manually)
    // No automocking – we want explicit control.
  },
  resolve: {
    alias: {
      // Allow imports from @omnimarket/shared to resolve correctly during tests
      '@omnimarket/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
