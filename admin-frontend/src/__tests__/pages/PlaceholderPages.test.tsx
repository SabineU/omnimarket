// admin-frontend/src/__tests__/pages/PlaceholderPages.test.tsx
// Simple render tests for remaining placeholder pages.
// OrdersPage now has its own dedicated test file.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SellersPage from '../../pages/SellersPage';

describe('Placeholder pages', () => {
  it('renders SellersPage', () => {
    render(<SellersPage />);
    expect(screen.getByTestId('admin-sellers-page')).toBeInTheDocument();
  });
});
