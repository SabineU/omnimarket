// frontend/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // .tsx extension allowed thanks to allowImportingTsExtensions
import './index.css';

// Get the root element; if it's missing, throw a clear error (no non-null assertion)
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure there is a <div id="root"></div> in your index.html.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
