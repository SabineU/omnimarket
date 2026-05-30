// admin-frontend/src/__tests__/pages/SellersPage.test.tsx
// Unit tests for the admin SellersPage (seller verification interface).
// Covers: loading spinner, error state, seller rows, approve/reject buttons,
// confirmation modal, search, filter, and pagination.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SellersPage from '../../pages/SellersPage';
import { apiClient } from '../../lib/api-client';

// Mock the API client and toast
vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

/**
 * Helper: render SellersPage with all required providers.
 * QueryClientProvider is needed because the page uses React Query hooks.
 * BrowserRouter is needed because the page may contain links.
 */
function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SellersPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('SellersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Loading State
  // ==========================================================================
  it('shows loading spinner initially', () => {
    // The API call never resolves → stays in loading state forever
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();

    // Verify the spinner SVG is present in the DOM
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ==========================================================================
  // Error State
  // ==========================================================================
  it('shows error message on fetch failure', async () => {
    // Simulate a network error
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Sellers error'));
    renderWithProviders();

    // Wait for the error message to appear
    const errorMsg = await screen.findByText(/Sellers error/i);
    expect(errorMsg).toBeInTheDocument();
  });

  // ==========================================================================
  // Empty State
  // ==========================================================================
  it('shows empty state when no sellers exist', async () => {
    // Return an empty list
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });
    renderWithProviders();

    const emptyMsg = await screen.findByText(/No sellers found/i);
    expect(emptyMsg).toBeInTheDocument();
  });

  // ==========================================================================
  // Populated Table
  // ==========================================================================
  it('renders seller rows with correct data', async () => {
    const sellers = [
      {
        userId: 'seller-1',
        name: 'Bob Seller',
        email: 'bob@test.com',
        storeName: 'Bob Store',
        description: 'Best gadgets',
        isApproved: false,
        commissionRate: 10,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
      {
        userId: 'seller-2',
        name: 'Alice Merchant',
        email: 'alice@test.com',
        storeName: 'Alice Shop',
        description: null,
        isApproved: true,
        commissionRate: 12,
        createdAt: '2026-04-15T00:00:00.000Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 2, limit: 10 },
        },
      },
    });
    renderWithProviders();

    // Wait for the table to render
    const table = await screen.findByTestId('sellers-table');
    expect(table).toBeInTheDocument();

    // Check seller names and store names are visible
    expect(screen.getByText('Bob Seller')).toBeInTheDocument();
    expect(screen.getByText('Alice Merchant')).toBeInTheDocument();
    expect(screen.getByText('Bob Store')).toBeInTheDocument();
    expect(screen.getByText('Alice Shop')).toBeInTheDocument();

    // Check status badges
    const bobStatus = screen.getByTestId('seller-status-seller-1');
    expect(bobStatus).toHaveTextContent('Pending'); // isApproved: false

    const aliceStatus = screen.getByTestId('seller-status-seller-2');
    expect(aliceStatus).toHaveTextContent('Approved'); // isApproved: true

    // Check action buttons
    // Pending seller → should have "Approve" button
    expect(screen.getByTestId('approve-seller-seller-1')).toBeInTheDocument();
    // Approved seller → should have "Revoke" button
    expect(screen.getByTestId('reject-seller-seller-2')).toBeInTheDocument();
  });

  // ==========================================================================
  // Approve Flow (Confirmation Modal → Mutation)
  // ==========================================================================
  it('opens confirmation modal when Approve is clicked, then calls API on confirm', async () => {
    const sellers = [
      {
        userId: 'seller-1',
        name: 'Bob Seller',
        email: 'bob@test.com',
        storeName: 'Bob Store',
        description: null,
        isApproved: false,
        commissionRate: 10,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ];
    // First call: fetch sellers list
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 },
        },
      },
    });
    // Second call: the approve mutation
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { userId: 'seller-1', isApproved: true, storeName: 'Bob Store' } },
      },
    });

    renderWithProviders();

    // Wait for the table to load
    await screen.findByTestId('sellers-table');

    // Click the "Approve" button
    const approveBtn = screen.getByTestId('approve-seller-seller-1');
    await userEvent.click(approveBtn);

    // The confirmation modal should appear
    const confirmBtn = await screen.findByTestId('confirm-modal-confirm');
    expect(confirmBtn).toBeInTheDocument();
    expect(screen.getByText(/Approve Seller/)).toBeInTheDocument();

    // Click "Approve" in the modal
    await userEvent.click(confirmBtn);

    // Verify the PATCH API call was made
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/sellers/seller-1', {
      isApproved: true,
    });
  });

  // ==========================================================================
  // Revoke Flow
  // ==========================================================================
  it('opens confirmation modal when Revoke is clicked, then calls API on confirm', async () => {
    const sellers = [
      {
        userId: 'seller-2',
        name: 'Alice Merchant',
        email: 'alice@test.com',
        storeName: 'Alice Shop',
        description: null,
        isApproved: true,
        commissionRate: 12,
        createdAt: '2026-04-15T00:00:00.000Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 },
        },
      },
    });
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { userId: 'seller-2', isApproved: false, storeName: 'Alice Shop' } },
      },
    });

    renderWithProviders();
    await screen.findByTestId('sellers-table');

    // Click "Revoke"
    await userEvent.click(screen.getByTestId('reject-seller-seller-2'));

    // Modal appears
    const confirmBtn = await screen.findByTestId('confirm-modal-confirm');
    expect(screen.getByText(/Revoke Seller Approval/)).toBeInTheDocument();

    // Confirm
    await userEvent.click(confirmBtn);

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/sellers/seller-2', {
      isApproved: false,
    });
  });

  // ==========================================================================
  // Filter by Approval Status
  // ==========================================================================
  it('filters by approval status when dropdown changes', async () => {
    // Initial load
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });

    renderWithProviders();
    await screen.findByTestId('admin-sellers-page');

    // Change the status filter dropdown to "Pending Approval"
    const select = screen.getByTestId('seller-status-filter');
    await userEvent.selectOptions(select, 'false');

    // The API should be called with isApproved=false in the URL
    const calls = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1] as [string];
    expect(lastCall[0]).toContain('isApproved=false');
  });

  // ==========================================================================
  // Pagination
  // ==========================================================================
  it('paginates to the next page when Next is clicked', async () => {
    const page1Sellers = [
      {
        userId: 'seller-1',
        name: 'Page 1 Seller',
        email: 'p1@test.com',
        storeName: 'Store 1',
        description: null,
        isApproved: false,
        commissionRate: 10,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ];
    const page2Sellers = [
      {
        userId: 'seller-2',
        name: 'Page 2 Seller',
        email: 'p2@test.com',
        storeName: 'Store 2',
        description: null,
        isApproved: true,
        commissionRate: 15,
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ];

    // Mock two sequential API calls
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            sellers: page1Sellers,
            pagination: { currentPage: 1, totalPages: 2, totalItems: 2, limit: 10 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            sellers: page2Sellers,
            pagination: { currentPage: 2, totalPages: 2, totalItems: 2, limit: 10 },
          },
        },
      });

    renderWithProviders();

    // Page 1 should show the first seller
    await screen.findByText('Page 1 Seller');
    expect(screen.queryByText('Page 2 Seller')).not.toBeInTheDocument();

    // Click "Next"
    const nextButton = screen.getByTestId('next-page');
    await userEvent.click(nextButton);

    // Page 2 should now show the second seller
    expect(await screen.findByText('Page 2 Seller')).toBeInTheDocument();
    expect(screen.queryByText('Page 1 Seller')).not.toBeInTheDocument();
  });
});
