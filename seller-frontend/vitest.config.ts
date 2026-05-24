// seller-frontend/vitest.config.ts
// Vitest configuration for the seller portal workspace.
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
        // Hooks
        'src/hooks/useSellerProducts.ts',
        'src/hooks/useProductMutations.ts',
        'src/hooks/useCategories.ts',
        'src/hooks/useImageUpload.ts',
        'src/hooks/useSellerOrders.ts',
        'src/hooks/useUpdateOrderStatus.ts',
        'src/hooks/useSellerDashboard.ts',
        'src/hooks/useSellerLedger.ts',

        // Components
        'src/components/ProductFormModal.tsx',
        'src/components/ProtectedRoute.tsx',
        'src/components/ImageUploadRow.tsx',

        // Pages
        'src/pages/ProductsPage.tsx',
        'src/pages/OrdersPage.tsx',
        'src/pages/Dashboard.tsx',
        'src/pages/LedgerPage.tsx',
        'src/pages/LoginPage.tsx',
        'src/pages/RegisterPage.tsx',
        'src/pages/ProfilePage.tsx',
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
