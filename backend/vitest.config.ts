// backend/vitest.config.ts
// Vitest configuration for the backend workspace.
// Tests are located in src/__tests__ and use .test.ts extension.

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Where Vitest looks for test files
    include: ['src/__tests__/**/*.test.ts'],

    // Environment – 'node' means no DOM, just server‑side logic
    environment: 'node',

    // setupFiles run in the same worker context as the tests, before any test code.
    // This allows us to load .env.test variables into process.env.
    setupFiles: ['./vitest.setup.ts'],

    // ---------------------------------------------------------------------------
    // Coverage configuration – measures how much source code is exercised by tests.
    // Because the real @prisma/client conflicts with the coverage instrumenter,
    // we run coverage only on unit tests (which mock Prisma).  The API tests are
    // still executed by `pnpm test:api` and `pnpm test`.
    //
    // NOTE: As we add tests for more modules, add their paths to the include list
    // below so that coverage reports stay accurate and thresholds remain enforced.
    // ---------------------------------------------------------------------------
    coverage: {
      // Use the v8 coverage provider (fast, built into Node.js, no extra dependencies)
      provider: 'v8',

      // Only include files that currently have unit tests.
      // When you write tests for controllers, middlewares, or routes, add them here.
      include: [
        'src/services/auth.service.ts',
        //'src/utils/jwt.ts',
        // TODO: add more files as tests are written for them:
        // 'src/controllers/auth.controller.ts',
        // 'src/middlewares/validate.ts',
        // 'src/middlewares/auth.ts',
        // 'src/middlewares/error-handler.ts',
        // 'src/routes/auth.routes.ts',
      ],

      // Exclude test files and type declaration files
      exclude: ['src/__tests__/**', 'src/test-utils/**', 'src/types/**', 'src/**/*.d.ts'],

      // Generate coverage reports in multiple formats:
      // - 'text': summary printed in the terminal
      // - 'html': interactive HTML report in the coverage/ folder
      // - 'lcov': standard format for CI tools (Codecov, Coveralls)
      reporter: ['text', 'html', 'lcov'],

      // Directory where the HTML report will be written
      reportsDirectory: './coverage',

      // ------------------------------------------------------------------
      // THRESHOLDS – if coverage falls below these levels, Vitest will fail.
      // These match the quality gates defined in our README.md.
      // ------------------------------------------------------------------
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
      // Allow imports from @omnimarket/shared to resolve correctly during tests
      '@omnimarket/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
