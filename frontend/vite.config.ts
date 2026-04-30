// frontend/vite.config.ts
// Vite configuration for the OmniMarket customer frontend.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Tailwind CSS v4 Vite plugin
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // enables Tailwind's CSS-based configuration
  ],
  resolve: {
    alias: {
      // Map '@omnimarket/shared' imports to the actual shared package source
      '@omnimarket/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API requests to our backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
