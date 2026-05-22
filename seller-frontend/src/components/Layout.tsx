// seller-frontend/src/components/Layout.tsx
// Shared layout for the seller portal – sidebar navigation + top bar.
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Layout(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" data-testid="seller-layout">
      {/* Top bar */}
      <header
        className="bg-primary-600 text-white shadow-md px-6 py-3 flex items-center justify-between"
        data-testid="seller-header"
      >
        <Link to="/" className="flex items-center gap-3 text-xl font-bold">
          <img src="/logo.png" alt="OmniMarket" className="h-8 w-auto" />
          <span>OmniMarket Seller</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm hover:underline"
            data-testid="seller-logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 p-4 space-y-2"
          data-testid="seller-sidebar"
        >
          <Link
            to="/"
            className="block px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200"
            data-testid="nav-dashboard"
          >
            Dashboard
          </Link>
          <Link
            to="/products"
            className="block px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200"
            data-testid="nav-products"
          >
            Products
          </Link>
          <Link
            to="/orders"
            className="block px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200"
            data-testid="nav-orders"
          >
            Orders
          </Link>
          {/* NEW: Profile link */}
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200"
            data-testid="nav-profile"
          >
            Profile
          </Link>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
