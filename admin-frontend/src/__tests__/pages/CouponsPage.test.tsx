// admin-frontend/src/__tests__/pages/CouponsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CouponsPage from '../../pages/CouponsPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CouponsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('CouponsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Coupons error'));
    renderWithProviders();
    expect(await screen.findByText(/Coupons error/i)).toBeInTheDocument();
  });

  it('renders coupon rows', async () => {
    const coupons = [
      {
        id: '1',
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: null,
        usageLimit: null,
        usedCount: 0,
        expiresAt: null,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons } },
    });
    renderWithProviders();
    expect(await screen.findByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByText('10% off')).toBeInTheDocument();
  });

  it('opens the create coupon modal', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons: [] } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('add-coupon-button'));
    expect(await screen.findByTestId('coupon-form-backdrop')).toBeInTheDocument();
  });

  it('opens the edit coupon modal', async () => {
    const coupons = [
      {
        id: '1',
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: null,
        usageLimit: null,
        usedCount: 0,
        expiresAt: null,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('edit-coupon-1'));
    expect(await screen.findByTestId('coupon-form-backdrop')).toBeInTheDocument();
  });

  it('calls delete mutation when confirm is clicked', async () => {
    const coupons = [
      {
        id: '1',
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: null,
        usageLimit: null,
        usedCount: 0,
        expiresAt: null,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons } },
    });
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();
    await userEvent.click(await screen.findByTestId('delete-coupon-1'));
    await userEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    expect(apiClient.delete).toHaveBeenCalledWith('/admin/coupons/1');
  });

  it('submits the create form with valid data and calls API', async () => {
    // Return empty coupon list so the page renders with no coupons
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons: [] } },
    });
    // Mock the POST request for creating the coupon
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupon: { id: 'new-coupon', code: 'SAVE50' } } },
    });

    renderWithProviders();

    // Open the modal
    await userEvent.click(await screen.findByTestId('add-coupon-button'));
    expect(screen.getByTestId('coupon-form-backdrop')).toBeInTheDocument();

    // Fill in required fields
    await userEvent.type(screen.getByTestId('coupon-form-code'), 'SAVE50');
    // Discount type defaults to PERCENTAGE
    await userEvent.clear(screen.getByTestId('coupon-form-value'));
    await userEvent.type(screen.getByTestId('coupon-form-value'), '50');
    // Optional: leave min cart, usage limit, and expiration empty

    // Submit the form
    await userEvent.click(screen.getByTestId('coupon-form-submit'));

    // Verify that the API was called with only the non‑null fields
    expect(apiClient.post).toHaveBeenCalledWith('/admin/coupons', {
      code: 'SAVE50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      // null / undefined fields should NOT be present
    });
    // The modal should close on success (toast is already tested in hooks)
  });

  it('does not send null optional fields when creating a coupon', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons: [] } },
    });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupon: { id: 'c2', code: 'NOEXPIRE' } } },
    });

    renderWithProviders();
    await userEvent.click(await screen.findByTestId('add-coupon-button'));

    await userEvent.type(screen.getByTestId('coupon-form-code'), 'NOEXPIRE');
    await userEvent.clear(screen.getByTestId('coupon-form-value'));
    await userEvent.type(screen.getByTestId('coupon-form-value'), '20');
    // Leave expiration and minCart empty → should not send them

    await userEvent.click(screen.getByTestId('coupon-form-submit'));

    // Assert that the payload does NOT contain expiresAt, minCartAmount, or usageLimit
    const calls = (apiClient.post as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = calls[1]; // second argument to apiClient.post
    expect(payload).not.toHaveProperty('expiresAt');
    expect(payload).not.toHaveProperty('minCartAmount');
    expect(payload).not.toHaveProperty('usageLimit');
    expect(payload).toHaveProperty('code', 'NOEXPIRE');
    expect(payload).toHaveProperty('discountValue', 20);
  });
});
