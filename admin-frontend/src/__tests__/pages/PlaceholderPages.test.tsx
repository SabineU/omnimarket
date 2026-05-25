// admin-frontend/src/__tests__/pages/PlaceholderPages.test.tsx
// Simple render tests for remaining placeholder pages.
// (Dashboard, UsersPage, and ProductsPage are tested in their own files.)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SellersPage from '../../pages/SellersPage';
import OrdersPage from '../../pages/OrdersPage';

describe('Placeholder pages', () => {
  it('renders SellersPage', () => {
    render(<SellersPage />);
    expect(screen.getByTestId('admin-sellers-page')).toBeInTheDocument();
  });
  it('renders OrdersPage', () => {
    render(<OrdersPage />);
    expect(screen.getByTestId('admin-orders-page')).toBeInTheDocument();
  });
});
