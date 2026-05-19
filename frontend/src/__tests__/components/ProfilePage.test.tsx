// frontend/src/__tests__/components/ProfilePage.test.tsx
// Unit tests for the ProfilePage component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../../pages/ProfilePage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

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

  it('renders user email and name fields', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { user: { id: 'u1', email: 'test@test.com', name: 'Tester', role: 'customer' } },
        },
      }) // profile
      .mockResolvedValueOnce({ data: { status: 'success', data: { addresses: [] } } }); // addresses

    renderWithProviders();

    // Wait for profile data
    const emailInput = await screen.findByTestId('profile-email-input');
    expect(emailInput).toHaveValue('test@test.com');

    const nameInput = screen.getByTestId('profile-name-input');
    expect(nameInput).toHaveValue('Tester');
  });

  it('renders the "Add Address" button when no addresses exist', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { user: { id: 'u1', email: 'test@test.com', name: 'Tester', role: 'customer' } },
        },
      })
      .mockResolvedValueOnce({ data: { status: 'success', data: { addresses: [] } } });

    renderWithProviders();

    const addButton = await screen.findByTestId('add-address-button');
    expect(addButton).toBeInTheDocument();
  });

  it('renders existing addresses', async () => {
    const addresses = [
      {
        id: 'a1',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'US',
        isDefault: true,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { user: { id: 'u1', email: 'test@test.com', name: 'Tester', role: 'customer' } },
        },
      })
      .mockResolvedValueOnce({ data: { status: 'success', data: { addresses } } });

    renderWithProviders();

    const addressItem = await screen.findByTestId('address-item-a1');
    expect(addressItem).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('opens inline add address form', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { user: { id: 'u1', email: 'test@test.com', name: 'Tester', role: 'customer' } },
        },
      })
      .mockResolvedValueOnce({ data: { status: 'success', data: { addresses: [] } } });

    renderWithProviders();

    const addButton = await screen.findByTestId('add-address-button');
    await userEvent.click(addButton);

    // Form should appear
    expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    expect(screen.getByTestId('save-new-address-button')).toBeInTheDocument();
  });
});
