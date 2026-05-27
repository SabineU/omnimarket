// admin-frontend/src/__tests__/pages/SettingsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from '../../pages/SettingsPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SettingsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
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
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Settings error'));
    renderWithProviders();
    expect(await screen.findByText(/Settings error/i)).toBeInTheDocument();
  });

  it('renders setting rows', async () => {
    const settings = [{ id: '1', key: 'commissionRate', value: '10', updatedAt: '' }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { settings } },
    });
    renderWithProviders();

    expect(await screen.findByText('commissionRate')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('enters edit mode and saves new value', async () => {
    const settings = [{ id: '1', key: 'commissionRate', value: '10', updatedAt: '' }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { settings } },
    });
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { setting: { id: '1', key: 'commissionRate', value: '15' } },
      },
    });

    renderWithProviders();

    // Wait for the row
    await screen.findByText('commissionRate');

    // Click Edit
    await userEvent.click(screen.getByTestId('setting-edit-commissionRate'));

    // The input should appear
    const input = screen.getByTestId('setting-input-commissionRate');
    expect(input).toBeInTheDocument();

    // Clear and type new value
    await userEvent.clear(input);
    await userEvent.type(input, '15');

    // Click Save
    await userEvent.click(screen.getByTestId('setting-save-commissionRate'));

    // Verify API call
    expect(apiClient.put).toHaveBeenCalledWith('/admin/settings', {
      key: 'commissionRate',
      value: '15',
    });
  });
});
