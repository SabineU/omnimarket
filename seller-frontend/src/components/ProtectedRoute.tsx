// seller-frontend/src/components/ProtectedRoute.tsx
// Redirects to /login if the user is not authenticated or not a seller.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute(): React.JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center py-16">Loading…</div>;
  }

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
