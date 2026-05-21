// seller-frontend/src/main.tsx
// Entry point for the seller portal.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// Grab the root element from the HTML file.  If it doesn't exist
// (which should never happen in normal operation), throw a helpful
// error instead of using a non‑null assertion, to satisfy the
// @typescript-eslint/no-non-null-assertion rule.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure there is a <div id="root"> in your index.html.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" />
  </StrictMode>,
);
