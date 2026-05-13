// frontend/vitest.config.ts
// Vitest configuration for the frontend workspace.
// Tests are located alongside components and hooks with .test.tsx / .test.ts extensions.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Where Vitest looks for test files
    include: ['src/**/*.test.{ts,tsx}'],

    // Browser-like environment (jsdom)
    environment: 'jsdom',

    // Path to the setup file that runs before every test
    setupFiles: ['./src/test-setup.ts'],

    // Make CSS imports not break tests
    css: false,
  },
  resolve: {
    alias: {
      // Allow imports from @omnimarket/shared to resolve correctly
      '@omnimarket/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
