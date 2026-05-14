// frontend/src/__tests__/components/SearchBar.test.tsx
// Unit tests for the SearchBar autocomplete component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from '../../components/SearchBar';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '../../lib/api-client';

// Create a fresh QueryClient for each test
function renderWithProviders(): ReturnType<typeof render> {
  // <-- added return type
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SearchBar', () => {
  it('should render the search input', () => {
    renderWithProviders();
    const input = screen.getByTestId('global-search-input');
    expect(input).toBeInTheDocument();
  });

  it('should update input value when user types', async () => {
    renderWithProviders();
    const input = screen.getByTestId('global-search-input') as HTMLInputElement;
    await userEvent.type(input, 'laptop');
    expect(input.value).toBe('laptop');
  });

  it('should show dropdown after typing (debounce simulation)', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        products: [
          {
            id: 'p1',
            name: 'Laptop',
            slug: 'laptop',
            basePrice: 999,
            images: [{ url: 'http://example.com/img.jpg', altText: 'img' }],
          },
        ],
      },
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockResponse });

    renderWithProviders();
    const input = screen.getByTestId('global-search-input');

    await userEvent.type(input, 'lap');

    await waitFor(() => {
      expect(screen.getByTestId('search-suggestion-laptop')).toBeInTheDocument();
    });
  });

  it('should close dropdown when pressing Escape', async () => {
    renderWithProviders();
    const input = screen.getByTestId('global-search-input');

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        status: 'success',
        data: { products: [] },
      },
    });
    await userEvent.type(input, 'xyz');
    // Wait a moment for debounced query, then press Escape
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByTestId('search-dropdown')).not.toBeInTheDocument();
  });
});
