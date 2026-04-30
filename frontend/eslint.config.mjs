// frontend/eslint.config.mjs
// Frontend‑specific ESLint configuration. Extends the monorepo root config
// and adds React plugin rules that only apply to the frontend workspace.

// 1. Import the root configuration array
import rootConfig from '../eslint.config.mjs';

// 2. Import React plugins (already installed in frontend devDependencies)
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Spread all root config objects (so we inherit every rule and setting)
  ...rootConfig,

  // Add a configuration object that activates React‑specific plugins
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Enable all recommended React Hooks rules (e.g., rules of hooks)
      ...reactHooks.configs.recommended.rules,
      // Warn if a component doesn’t export correctly for Fast Refresh
      'react-refresh/only-export-components': 'warn',
    },
  },
];
