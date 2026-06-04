// admin-frontend/src/App.tsx
// Admin panel – routes with code splitting for heavy pages.
import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LazyPage from './components/LazyPage'; // <-- NEW

// Eagerly loaded page
import LoginPage from './pages/LoginPage';

// Lazy‑loaded pages (all admin pages are heavy – charts, tables, forms)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SellersPage = lazy(() => import('./pages/SellersPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CouponsPage = lazy(() => import('./pages/CouponsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes – require ADMIN role */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<LazyPage component={Dashboard} />} />
                <Route path="/users" element={<LazyPage component={UsersPage} />} />
                <Route path="/sellers" element={<LazyPage component={SellersPage} />} />
                <Route path="/products" element={<LazyPage component={ProductsPage} />} />
                <Route path="/orders" element={<LazyPage component={OrdersPage} />} />
                <Route path="/categories" element={<LazyPage component={CategoriesPage} />} />
                <Route path="/coupons" element={<LazyPage component={CouponsPage} />} />
                <Route path="/settings" element={<LazyPage component={SettingsPage} />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
