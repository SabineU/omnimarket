// frontend/src/App.tsx
// Main application component with all routes.
// Includes default SEO meta tags via react‑helmet‑async.
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async'; // <-- NEW
import { AuthProvider } from './contexts/AuthProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import { WishlistProvider } from './contexts/WishlistProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';

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
                content="OmniMarket is a multi‑vendor marketplace where you can buy and sell anything – electronics, fashion, home goods, and more."
              />
              {/* Open Graph (Facebook, LinkedIn, etc.) */}
              <meta property="og:title" content="OmniMarket – Everything, All in One Place" />
              <meta
                property="og:description"
                content="Discover millions of products from thousands of sellers."
              />
              <meta property="og:type" content="website" />
              <meta property="og:url" content={window.location.href} />
              <meta property="og:image" content="/logo.png" />
              {/* Twitter Card */}
              <meta name="twitter:card" content="summary" />
              <meta name="twitter:title" content="OmniMarket" />
              <meta
                name="twitter:description"
                content="Discover millions of products from thousands of sellers."
              />
              <meta name="twitter:image" content="/logo.png" />
            </Helmet>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route
                  path="/products/:productSlug"
                  element={
                    <ErrorBoundary>
                      <ProductDetailPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ErrorBoundary>
                        <OrderDetailPage />
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
