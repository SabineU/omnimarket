// seller-frontend/src/App.tsx
// Main application component with routes for the seller portal.
// Now includes a registration page and a profile page.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // <-- added
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage'; // <-- added

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
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
