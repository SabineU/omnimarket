// frontend/src/components/Layout.tsx
// Shared layout wrapper for all customer pages.
// Contains a responsive header (logo, search, nav, cart) and the common footer.
import { Outlet, Link } from 'react-router-dom';
import Footer from './Footer';

function Layout(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* ---- Header ---- */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 gap-4">
          {/* Logo + brand name – clicking returns to home */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/logo.png" alt="OmniMarket" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight hidden sm:inline">OmniMarket</span>
          </Link>

          {/* ---- Search bar placeholder ---- */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              {/* Magnifying glass icon (inline SVG) */}
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search for anything…"
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors"
                // No onChange handler yet – this is a visual placeholder
              />
            </div>
          </div>

          {/* ---- Right side: navigation + cart ---- */}
          <div className="flex items-center gap-4">
            {/* Desktop navigation links */}
            <nav className="hidden space-x-5 text-sm font-medium md:flex">
              <Link to="/" className="hover:text-primary-200 transition-colors">
                Home
              </Link>
              <Link to="/products" className="hover:text-primary-200 transition-colors">
                Shop
              </Link>
              <Link to="/login" className="hover:text-primary-200 transition-colors">
                Login
              </Link>
            </nav>

            {/* Cart icon with item count */}
            <Link
              to="/cart"
              className="relative p-2 rounded-full hover:bg-primary-500 transition-colors"
              aria-label="Shopping cart"
            >
              {/* Cart SVG icon */}
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              {/* Badge showing number of items (hard‑coded 0 for now) */}
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error-500 rounded-full">
                0
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---- Main content – the active page is rendered here ---- */}
      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 w-full">
        <Outlet />
      </main>

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}

export default Layout;
