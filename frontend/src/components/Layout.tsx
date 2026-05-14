// frontend/src/components/Layout.tsx
// Shared layout wrapper for all customer pages.
// Contains a responsive header (logo, autocomplete search, nav, cart,
// dark‑mode toggle, wishlist) and the common footer.
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import SearchBar from './SearchBar'; // <-- added
import MegaMenu from './MegaMenu';
import Footer from './Footer';

function Layout(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useWishlist();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col">
      {/* ---- Header ---- */}
      <header
        className="bg-primary-600 text-white shadow-md sticky top-0 z-50"
        data-testid="site-header"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-4">
          {/* Logo + brand name */}
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="logo-link">
            <img src="/logo.png" alt="OmniMarket" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight hidden sm:inline">OmniMarket</span>
          </Link>

          {/* Autocomplete search bar – replaces the old static input */}
          <SearchBar />

          {/* Right side: nav, dark‑mode toggle, wishlist, cart */}
          <div className="flex items-center gap-4">
            <nav
              className="hidden space-x-5 text-sm font-medium md:flex items-center"
              data-testid="main-navigation"
            >
              <Link
                to="/"
                className="hover:text-primary-200 transition-colors"
                data-testid="nav-home"
              >
                Home
              </Link>
              <MegaMenu />
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="hover:text-primary-200 transition-colors"
                    data-testid="nav-profile"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="hover:text-primary-200 transition-colors"
                    data-testid="nav-orders"
                  >
                    Orders
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hover:text-primary-200 transition-colors text-sm font-medium"
                    data-testid="nav-logout"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="hover:text-primary-200 transition-colors"
                  data-testid="nav-login"
                >
                  Login
                </Link>
              )}
            </nav>

            {/* Dark‑mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-primary-500 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-testid="dark-mode-toggle"
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

            {/* Wishlist link (only when logged in) */}
            {user && (
              <Link
                to="/wishlist"
                className="relative p-2 rounded-full hover:bg-primary-500 transition-colors"
                aria-label="Wishlist"
                data-testid="wishlist-link"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error-500 rounded-full">
                    {count}
                  </span>
                )}
              </Link>
            )}

            {/* Cart icon */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full hover:bg-primary-500 transition-colors"
              aria-label="Shopping cart"
              data-testid="cart-link"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              <span
                className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error-500 rounded-full"
                data-testid="cart-count"
              >
                0
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 w-full">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
