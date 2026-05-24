// seller-frontend/src/__tests__/pages/LedgerPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import LedgerPage from '../../pages/LedgerPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LedgerPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('LedgerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Ledger error'));
    renderWithProviders();
    expect(await screen.findByText(/Ledger error/i)).toBeInTheDocument();
  });

  it('renders summary cards with data', async () => {
    const ledger = {
      totalEarned: 1000,
      commissionRate: 10,
      totalCommission: 100,
      netEarnings: 900,
      pendingPayout: 900,
      transactions: [],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: ledger },
    });
    renderWithProviders();
    expect(await screen.findByTestId('stat-total-earned')).toHaveTextContent('$1000.00');
    expect(screen.getByTestId('stat-net-earnings')).toHaveTextContent('$900.00');
    expect(screen.getByTestId('stat-pending-payout')).toHaveTextContent('$900.00');
  });

  it('renders transactions table with data', async () => {
    const ledger = {
      totalEarned: 200,
      commissionRate: 5,
      totalCommission: 10,
      netEarnings: 190,
      pendingPayout: 190,
      transactions: [
        {
          orderId: 'order-1',
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 50,
          total: 100,
          orderStatus: 'CONFIRMED',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: ledger },
    });
    renderWithProviders();
    expect(await screen.findByText('Test Product')).toBeInTheDocument();
  });

  it('shows the Export CSV button', async () => {
    const ledger = {
      totalEarned: 0,
      commissionRate: 10,
      totalCommission: 0,
      netEarnings: 0,
      pendingPayout: 0,
      transactions: [],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: ledger },
    });
    renderWithProviders();
    const exportButton = await screen.findByTestId('ledger-export-csv');
    expect(exportButton).toBeInTheDocument();
  });

  it('calls API when Export CSV is clicked', async () => {
    const ledger = {
      totalEarned: 0,
      commissionRate: 10,
      totalCommission: 0,
      netEarnings: 0,
      pendingPayout: 0,
      transactions: [],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: ledger },
    });
    // Mock the CSV endpoint response as a blob
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: new Blob(['test'], { type: 'text/csv' }),
    });

    renderWithProviders();

    const exportButton = await screen.findByTestId('ledger-export-csv');
    await userEvent.click(exportButton);

    // Check that the API client was called with the correct URL and responseType
    expect(apiClient.get).toHaveBeenCalledWith('/seller/ledger/export/csv', {
      responseType: 'blob',
    });
  });
});
