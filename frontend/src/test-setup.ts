// frontend/src/test-setup.ts
// Vitest setup file – loads jest-dom matchers and cleans up after each test.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
