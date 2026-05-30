// frontend/src/components/Footer.tsx
// Professional e‑commerce footer with multiple link columns,
// contact info, social icons, payment badges, and legal links.
// Responsive: stacks on mobile, 4‑column grid on desktop.
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Inline SVG icon components (small, semantic, no external dependencies)
// ---------------------------------------------------------------------------

/** Facebook icon */
function FacebookIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

/** Twitter/X icon */
function TwitterIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Instagram icon */
function InstagramIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

/** LinkedIn icon */
function LinkedInIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Footer component
// ---------------------------------------------------------------------------

function Footer(): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-400 mt-auto" data-testid="site-footer">
      {/* ---- Top section: columns ---- */}
      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* ---- Column 1: About ---- */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            OmniMarket
          </h3>
          <p className="text-sm leading-relaxed">
            Your one‑stop marketplace for everything. We connect thousands of sellers with millions
            of buyers worldwide.
          </p>
        </div>

        {/* ---- Column 2: Shop Links ---- */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Shop</h3>
          <ul className="space-y-2">
            <li>
              <Link
                to="/products"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-shop-all"
              >
                All Products
              </Link>
            </li>
            <li>
              <Link
                to="/products?sort=newest"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-new-arrivals"
              >
                New Arrivals
              </Link>
            </li>
            <li>
              <Link
                to="/products?sort=price_asc"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-deals"
              >
                Deals & Discounts
              </Link>
            </li>
            <li>
              <Link
                to="/products?sort=price_asc"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-best-sellers"
              >
                Best Sellers
              </Link>
            </li>
          </ul>
        </div>

        {/* ---- Column 3: Customer Service ---- */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Customer Service
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                to="/profile"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-my-account"
              >
                My Account
              </Link>
            </li>
            <li>
              <Link
                to="/orders"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-order-status"
              >
                Order Status
              </Link>
            </li>
            <li>
              <Link
                to="/help/shipping"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-shipping"
              >
                Shipping Information
              </Link>
            </li>
            <li>
              <Link
                to="/help/returns"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-returns"
              >
                Returns & Exchanges
              </Link>
            </li>
            <li>
              <Link
                to="/help/contact"
                className="text-sm hover:text-white transition-colors"
                data-testid="footer-contact"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* ---- Column 4: Connect ---- */}
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Connect With Us
          </h3>
          {/* Social media icons */}
          <div className="flex gap-4 mb-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Facebook"
              data-testid="social-facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Twitter / X"
              data-testid="social-twitter"
            >
              <TwitterIcon />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Instagram"
              data-testid="social-instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="LinkedIn"
              data-testid="social-linkedin"
            >
              <LinkedInIcon />
            </a>
          </div>

          {/* Newsletter placeholder */}
          <p className="text-sm mb-2">Subscribe to our newsletter</p>
          <form
            className="flex gap-2"
            onSubmit={(e): void => e.preventDefault()}
            data-testid="footer-newsletter-form"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="footer-newsletter-input"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              data-testid="footer-newsletter-submit"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* ---- Bottom bar: copyright + payment icons ---- */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-xs text-neutral-500">
            &copy; {currentYear} OmniMarket. All rights reserved.
          </p>

          {/* Payment method badges (visual only) */}
          <div className="flex items-center gap-3" data-testid="footer-payment-methods">
            {/* Visa */}
            <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none" aria-label="Visa">
              <path
                d="M44.5 0h-41C1.6 0 0 1.6 0 3.5v9C0 14.4 1.6 16 3.5 16h41c1.9 0 3.5-1.6 3.5-3.5v-9C48 1.6 46.4 0 44.5 0z"
                fill="#1A1F71"
              />
              <text
                x="6"
                y="12"
                fill="white"
                fontSize="8"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                VISA
              </text>
            </svg>
            {/* Mastercard */}
            <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none" aria-label="Mastercard">
              <path
                d="M44.5 0h-41C1.6 0 0 1.6 0 3.5v9C0 14.4 1.6 16 3.5 16h41c1.9 0 3.5-1.6 3.5-3.5v-9C48 1.6 46.4 0 44.5 0z"
                fill="#16366F"
              />
              <circle cx="18" cy="8" r="5" fill="#EB001B" />
              <circle cx="30" cy="8" r="5" fill="#F79E1B" opacity="0.8" />
              <text
                x="6"
                y="12"
                fill="white"
                fontSize="7"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                MASTERCARD
              </text>
            </svg>
            {/* Stripe (simplified) */}
            <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none" aria-label="Stripe">
              <path
                d="M44.5 0h-41C1.6 0 0 1.6 0 3.5v9C0 14.4 1.6 16 3.5 16h41c1.9 0 3.5-1.6 3.5-3.5v-9C48 1.6 46.4 0 44.5 0z"
                fill="#635BFF"
              />
              <text
                x="6"
                y="12"
                fill="white"
                fontSize="8"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                STRIPE
              </text>
            </svg>
            {/* PayPal */}
            <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none" aria-label="PayPal">
              <path
                d="M44.5 0h-41C1.6 0 0 1.6 0 3.5v9C0 14.4 1.6 16 3.5 16h41c1.9 0 3.5-1.6 3.5-3.5v-9C48 1.6 46.4 0 44.5 0z"
                fill="#003087"
              />
              <text
                x="6"
                y="12"
                fill="white"
                fontSize="7"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                PayPal
              </text>
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
