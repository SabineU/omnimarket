// backend/vitest.config.ts
// Vitest configuration for the backend workspace.
// Tests are located in src/__tests__ and use .test.ts extension.

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],

    coverage: {
      provider: 'v8',
      include: [
        'src/services/auth.service.ts',
        'src/services/user.service.ts',
        'src/services/address.service.ts',
        'src/services/seller.service.ts',
        'src/services/admin.service.ts', // added
        // TODO: add more files as tests are written for them
      ],
      exclude: ['src/__tests__/**', 'src/test-utils/**', 'src/types/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 70,
        branches: 50,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@omnimarket/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
