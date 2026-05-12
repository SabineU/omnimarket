// frontend/src/components/Layout.tsx
// Shared layout wrapper for all customer pages.
// Contains the header, footer, and a content area that renders the active route.
import { Outlet, Link } from 'react-router-dom';

function Layout(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* ---- Header ---- */}
      <header className="bg-primary-600 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo + brand name – clicking returns to home */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="OmniMarket" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight">OmniMarket</span>
          </Link>
          {/* Navigation links */}
          <nav className="hidden space-x-6 text-sm font-medium md:flex">
            <Link to="/" className="hover:text-primary-200 transition-colors">
              Home
            </Link>
            <Link to="/products" className="hover:text-primary-200 transition-colors">
              Shop
            </Link>
            <Link to="/cart" className="hover:text-primary-200 transition-colors">
              Cart
            </Link>
            <Link to="/login" className="hover:text-primary-200 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Main content – the active page is rendered here ---- */}
      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 w-full">
        <Outlet /> {/* <-- React Router injects the matched page component here */}
      </main>

      {/* ---- Footer ---- */}
      <footer className="bg-neutral-800 text-neutral-400 py-8 mt-auto">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm">
          © {new Date().getFullYear()} OmniMarket. Built with 💜.
        </div>
      </footer>
    </div>
  );
}

export default Layout;
