// admin-frontend/src/__tests__/pages/PlaceholderPages.test.tsx
// Simple render tests for remaining placeholder pages.
// SellersPage now has its own dedicated test file.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrdersPage from '../../pages/OrdersPage';

describe('Placeholder pages', () => {
  it('renders OrdersPage', () => {
    render(<OrdersPage />);
    expect(screen.getByTestId('admin-orders-page')).toBeInTheDocument();
  });
});
