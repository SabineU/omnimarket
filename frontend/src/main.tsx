// frontend/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { WishlistProvider } from './contexts/WishlistProvider.tsx'; // <-- added
import App from './App.tsx';
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
    'Root element not found. Make sure there is a <div id="root"></div> in your index.html.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            {' '}
            {/* <-- added */}
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
