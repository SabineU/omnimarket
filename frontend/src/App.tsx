// frontend/src/App.tsx
// Main application component with all routes.
// Uses React.lazy + Suspense for code splitting – heavy pages
// are only downloaded when the user navigates to them.
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import { WishlistProvider } from './contexts/WishlistProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LazyPage from './components/LazyPage'; // <-- NEW

// ---- Eagerly loaded pages (used on first paint) ----
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ---- Lazy‑loaded pages (only downloaded when needed) ----
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            {/* Default SEO – overridden by pages with more specific tags */}
            <Helmet>
              <title>OmniMarket – Everything, All in One Place</title>
              <meta
                name="description"
                content="OmniMarket is a multi‑vendor marketplace where you can buy and sell anything."
              />
            </Helmet>
            <Routes>
              <Route element={<Layout />}>
                {/* Eager pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Lazy‑loaded pages */}
                <Route
                  path="/products/:productSlug"
                  element={
                    <ErrorBoundary>
                      <LazyPage component={ProductDetailPage} />
                    </ErrorBoundary>
                  }
                />
                <Route element={<ProtectedRoute />}>
                  <Route path="/cart" element={<LazyPage component={CartPage} />} />
                  <Route path="/checkout" element={<LazyPage component={CheckoutPage} />} />
                  <Route path="/wishlist" element={<LazyPage component={WishlistPage} />} />
                  <Route path="/profile" element={<LazyPage component={ProfilePage} />} />
                  <Route path="/orders" element={<LazyPage component={OrdersPage} />} />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ErrorBoundary>
                        <LazyPage component={OrderDetailPage} />
                      </ErrorBoundary>
                    }
                  />
                </Route>
              </Route>
            </Routes>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
