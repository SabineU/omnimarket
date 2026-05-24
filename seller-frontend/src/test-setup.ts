// seller-frontend/src/test-setup.ts
// Vitest setup file – loads jest-dom matchers and cleans up after each test.
import '@testing-library/jest-dom/vitest'; // <-- vitest-specific entry
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Automatically unmount components and clean up the DOM after every test
afterEach(() => {
  cleanup();
});
