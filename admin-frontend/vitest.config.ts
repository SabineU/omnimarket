// admin-frontend/vitest.config.ts
// Vitest configuration for the admin panel workspace.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: [
        // Contexts & Hooks
        'src/contexts/AuthProvider.tsx',
        'src/contexts/ThemeProvider.tsx',
        'src/contexts/auth-context.ts',
        'src/contexts/theme-context.ts',
        'src/hooks/useAuth.ts',
        'src/hooks/useTheme.ts',

        // Components
        'src/components/ProtectedRoute.tsx',
        'src/components/Layout.tsx',
        'src/components/ui/Button.tsx',

        // Pages
        'src/pages/LoginPage.tsx',
        'src/pages/Dashboard.tsx',
        'src/pages/UsersPage.tsx',
        'src/pages/SellersPage.tsx',
        'src/pages/ProductsPage.tsx',
        'src/pages/OrdersPage.tsx',
      ],
      exclude: ['src/__tests__/**', 'src/test-setup.ts', 'src/**/*.d.ts'],
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
