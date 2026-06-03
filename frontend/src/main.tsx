// frontend/src/main.tsx
// Entry point of the React application.
// Renders the <App /> inside React.StrictMode, a single BrowserRouter,
// the global toast notification container, and the HelmetProvider for SEO tags.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async'; // <-- NEW
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { WishlistProvider } from './contexts/WishlistProvider';
import App from './App';
import './index.css';

// Create a QueryClient with global defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // Data is fresh for 1 minute
      retry: 1,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure there is a <div id="root"> in your index.html.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    {/* HelmetProvider enables components to add SEO <meta> tags */}
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <WishlistProvider>
                <App />
                <Toaster position="top-right" gutter={8} />
              </WishlistProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
