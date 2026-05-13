// frontend/src/config.ts
// Centralised configuration for the frontend.
// Values come from Vite environment variables (import.meta.env).

export const config = {
  /** Base URL for the API (without trailing slash) */
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
} as const;
