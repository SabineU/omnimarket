// seller-frontend/src/App.tsx
// Seller portal – routes with code splitting for heavy pages.
import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LazyPage from './components/LazyPage'; // <-- NEW

// Eagerly loaded pages (login / register are small)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy‑loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LedgerPage = lazy(() => import('./pages/LedgerPage'));

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes – require seller/admin role */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<LazyPage component={Dashboard} />} />
                <Route path="/products" element={<LazyPage component={ProductsPage} />} />
                <Route path="/orders" element={<LazyPage component={OrdersPage} />} />
                <Route path="/profile" element={<LazyPage component={ProfilePage} />} />
                <Route path="/ledger" element={<LazyPage component={LedgerPage} />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
