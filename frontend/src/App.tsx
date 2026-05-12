// frontend/src/App.tsx
// OmniMarket customer storefront – starter page.
import React from 'react';

function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ---- Header ---- */}
      <header className="bg-primary-600 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo + brand name */}
          <div className="flex items-center gap-3">
            <img src="../public/logo.png" alt="OmniMarket" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight">OmniMarket</span>
          </div>
          {/* Placeholder navigation */}
          <nav className="hidden space-x-6 text-sm font-medium md:flex">
            <a href="#" className="hover:text-primary-200 transition-colors">
              Shop
            </a>
            <a href="#" className="hover:text-primary-200 transition-colors">
              Sell
            </a>
            <a href="#" className="hover:text-primary-200 transition-colors">
              About
            </a>
          </nav>
        </div>
      </header>

      {/* ---- Hero / Main content ---- */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Design system test card */}
        <div className="bg-primary-500 text-white p-6 rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold">OmniMarket Design System</h1>
          <p className="text-sm mt-2">Colors, fonts, and spacing are consistent.</p>
        </div>

        {/* Tagline placeholder */}
        <div className="mt-10 text-center">
          <h2 className="text-4xl font-bold text-neutral-900">Many worlds, one place.</h2>
          <p className="mt-4 text-lg text-neutral-600">
            Your universal marketplace for everything—electronics, fashion, home, groceries, and
            more.
          </p>
        </div>
      </main>

      {/* ---- Footer placeholder ---- */}
      <footer className="bg-neutral-800 text-neutral-400 py-8 mt-20">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm">
          © {new Date().getFullYear()} OmniMarket. Built with 💜.
        </div>
      </footer>
    </div>
  );
}

export default App;
