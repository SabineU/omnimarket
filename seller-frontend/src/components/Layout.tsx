// seller-frontend/src/components/Layout.tsx
// Shared layout for the seller portal – sidebar navigation + top bar.
// Dark‑mode toggle works via ThemeProvider context (same as customer app).
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

function Layout(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          {/* Dark‑mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-primary-500 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="seller-dark-mode-toggle"
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>

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
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200"
            data-testid="nav-profile"
          >
            Profile
          </Link>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
