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
    // ------------------------------------------------------------------
    coverage: {
      // Use the v8 provider (fast, built into Node.js)
      provider: 'v8',

      // Only measure files that currently have unit tests.
      // As we write new tests we add the corresponding source files here.
      include: [
        // Phase 13 and earlier
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

        // Phase 14 – Cart & Checkout hooks
        'src/hooks/useCart.ts',
        'src/hooks/useCartMutation.ts',
        'src/hooks/useUpdateCartItem.ts',
        'src/hooks/useRemoveCartItem.ts',
        'src/hooks/useValidateCoupon.ts',
        'src/hooks/useCreateOrder.ts',
        'src/hooks/useCompleteCheckout.ts',
        'src/hooks/useAddresses.ts',
        'src/hooks/useAddAddress.ts',

        // Phase 14 – Cart & Checkout components
        'src/components/CartDrawer.tsx',
        'src/components/checkout/AddressStep.tsx',

        // Phase 15 – Orders & Profile hooks
        'src/hooks/useCancelOrder.ts',
        'src/hooks/useReturnOrder.ts',
        'src/hooks/useSubmitReview.ts',
        'src/hooks/useProfile.ts',
        'src/hooks/useUpdateProfile.ts',
        'src/hooks/useUpdateAddress.ts',
        'src/hooks/useDeleteAddress.ts',

        // Phase 15 – Orders & Profile components
        'src/pages/OrdersPage.tsx',
        'src/pages/ProfilePage.tsx',
        'src/components/ReturnRequestModal.tsx',
        'src/components/ReviewForm.tsx',
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
