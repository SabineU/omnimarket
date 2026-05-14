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

    // ------------------------------------------------------------------
    // Coverage configuration
    //
    // To keep the report honest, we only include files that currently
    // have unit tests.  As we add tests for more files, we add their
    // paths here.  This mirrors the approach used in the backend.
    // ------------------------------------------------------------------
    coverage: {
      // Use the v8 provider (fast, built into Node.js)
      provider: 'v8',

      // Only measure files that have tests right now.
      // TODO: add more files as tests are written for them.
      include: [
        'src/components/ProtectedRoute.tsx',
        'src/components/ui/Button.tsx',
        'src/components/ui/Input.tsx',
        'src/hooks/useTheme.ts',
        'src/contexts/ThemeProvider.tsx',
        'src/contexts/theme-context.ts',
        'src/components/SearchBar.tsx',
        'src/components/WishlistButton.tsx',
        'src/contexts/WishlistProvider.tsx',
        'src/contexts/wishlist-context.ts',
        'src/hooks/useWishlist.ts',
        'src/pages/WishlistPage.tsx',
        // 'src/components/ui/PasswordInput.tsx',   // <-- removed until tests are written
        // TODO:
        // 'src/components/Layout.tsx',
        // 'src/components/ui/Card.tsx',
        // 'src/pages/LoginPage.tsx',
        // 'src/hooks/useProducts.ts',
        // …
      ],

      // Exclude test files, setup, and type declarations
      exclude: ['src/__tests__/**', 'src/test-setup.ts', 'src/**/*.d.ts', 'src/vite-env.d.ts'],

      // Report formats
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Thresholds – enforce minimum coverage for the files we measure
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
