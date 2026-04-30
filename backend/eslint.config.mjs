// backend/eslint.config.mjs
// ESLint flat config for the backend workspace – reuses the monorepo root config.
import rootConfig from '../eslint.config.mjs';

export default [
  ...rootConfig,
  // Backend-specific overrides can be added here later
  {
    rules: {
      // Example: allow console.warn/error in backend (server logging)
      'no-console': 'off',
    },
  },
];
