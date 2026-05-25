// admin-frontend/src/__tests__/pages/PlaceholderPages.test.tsx
// Simple render tests for placeholder pages (Dashboard is tested separately).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UsersPage from '../../pages/UsersPage';
import SellersPage from '../../pages/SellersPage';
import ProductsPage from '../../pages/ProductsPage';
import OrdersPage from '../../pages/OrdersPage';

describe('Placeholder pages', () => {
  it('renders UsersPage', () => {
    render(<UsersPage />);
    expect(screen.getByTestId('admin-users-page')).toBeInTheDocument();
  });
  it('renders SellersPage', () => {
    render(<SellersPage />);
    expect(screen.getByTestId('admin-sellers-page')).toBeInTheDocument();
  });
  it('renders ProductsPage', () => {
    render(<ProductsPage />);
    expect(screen.getByTestId('admin-products-page')).toBeInTheDocument();
  });
  it('renders OrdersPage', () => {
    render(<OrdersPage />);
    expect(screen.getByTestId('admin-orders-page')).toBeInTheDocument();
  });
});
