// frontend/src/components/ProtectedRoute.tsx
// Wraps child routes and redirects to /login if the user is not authenticated.
// While the auth context is still loading, a spinner is shown.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui';

function ProtectedRoute(): React.JSX.Element {
  const { user, isLoading } = useAuth();

  // 1. Auth state is still being determined – show a loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="h-8 w-8" color="text-primary-600" />
      </div>
    );
  }

  // 2. User is not logged in – redirect to login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. User is authenticated – render the child route (Outlet)
  return <Outlet />;
}

export default ProtectedRoute;
