// admin-frontend/src/main.tsx
// Entry point for the admin panel.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

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
