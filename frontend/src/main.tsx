// frontend/src/main.tsx
// Entry point of the React application.
// Renders the <App /> inside React.StrictMode, a single BrowserRouter,
// and the global toast notification container.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast'; // <-- added
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { WishlistProvider } from './contexts/WishlistProvider';
import App from './App';
import './index.css';

// Create a QueryClient with global defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 1 minute before a background refetch
      staleTime: 1 * 60 * 1000,
      // Retry failed requests once before showing an error
      retry: 1,
      // Keep cached data for 5 minutes after the component using it unmounts
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus in development (less noise)
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <WishlistProvider>
              <App />
              {/* Global toast container – renders all toast notifications
                  emitted from anywhere in the component tree.
                  position: top‑right is the standard e‑commerce placement.
                  gutter: vertical spacing between stacked toasts. */}
              <Toaster
                position="top-right"
                gutter={8}
                toastOptions={{
                  duration: 4000, // auto‑dismiss after 4 seconds
                  style: {
                    background: '#1f2937', // neutral‑800 in Tailwind
                    color: '#f9fafb', // neutral‑50
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981', // green‑500
                      secondary: '#f9fafb',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444', // red‑500
                      secondary: '#f9fafb',
                    },
                  },
                }}
              />
            </WishlistProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
