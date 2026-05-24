// seller-frontend/src/__tests__/pages/ProfilePage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../../pages/ProfilePage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fetch failed'));
    renderWithProviders();
    expect(await screen.findByText('Fetch failed')).toBeInTheDocument();
  });

  it('renders profile form when data loaded', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { storeName: 'My Store', description: 'A store', isApproved: true } },
      },
    });
    renderWithProviders();
    const storeNameInput = await screen.findByTestId('seller-profile-storename');
    expect(storeNameInput).toHaveValue('My Store');
    expect(screen.getByTestId('seller-profile-save')).toBeDisabled();
  });

  it('enables save button after edit', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { storeName: 'Old', description: '', isApproved: true } },
      },
    });
    renderWithProviders();
    const storeNameInput = await screen.findByTestId('seller-profile-storename');
    await userEvent.clear(storeNameInput);
    await userEvent.type(storeNameInput, 'New Store');
    expect(screen.getByTestId('seller-profile-save')).toBeEnabled();
  });

  it('shows pending approval banner when not approved', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { storeName: 'My Store', description: '', isApproved: false } },
      },
    });
    renderWithProviders();
    const banner = await screen.findByTestId('seller-pending-banner');
    expect(banner).toBeInTheDocument();
  });

  it('calls PUT and updates profile on save', async () => {
    // Initial load
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { storeName: 'Old', description: '', isApproved: true } },
      },
    });
    // PUT response
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { storeName: 'New Store', description: '', isApproved: true } },
      },
    });

    renderWithProviders();

    const storeNameInput = await screen.findByTestId('seller-profile-storename');
    await userEvent.clear(storeNameInput);
    await userEvent.type(storeNameInput, 'New Store');

    await userEvent.click(screen.getByTestId('seller-profile-save'));

    // The PUT request should have been made
    expect(apiClient.put).toHaveBeenCalledWith('/seller/profile', {
      storeName: 'New Store',
      description: '',
    });
  });
});
