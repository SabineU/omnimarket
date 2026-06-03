// frontend/src/__tests__/components/RecentlyViewedStrip.test.tsx
// Unit tests for the RecentlyViewedStrip component.
// Verifies loading, empty state, and product rendering.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import RecentlyViewedStrip from '../../components/RecentlyViewedStrip';
import { apiClient } from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ids: string[]): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecentlyViewedStrip ids={ids} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RecentlyViewedStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when ids array is empty', () => {
    const { container } = renderWithProviders([]);
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner while fetching', () => {
    // API call never resolves → loading state
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderWithProviders(['id1']);

    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText(/Loading your recent items/i)).toBeInTheDocument();
  });

  it('renders product cards when data is loaded', async () => {
    const products = [
      {
        id: 'p1',
        name: 'Recent Item',
        slug: 'recent-item',
        basePrice: 29.99,
        images: [{ url: 'http://example.com/img.jpg', altText: 'Product' }],
        averageRating: 4.5,
        reviewCount: 2,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products },
      },
    });

    renderWithProviders(['p1']);

    // Wait for the product name to appear
    expect(await screen.findByText('Recent Item')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    // The link should point to the product slug
    const link = screen.getByTestId('recently-viewed-product-recent-item');
    expect(link).toHaveAttribute('href', '/products/recent-item');
    // The section should be present
    expect(screen.getByTestId('recently-viewed-section')).toBeInTheDocument();
  });

  it('does not render anything when the API returns an error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('API error'));

    const { container } = renderWithProviders(['id1']);

    // Wait for the query to settle (error state)
    // We can wait for some time or use waitFor
    // Since the component returns null on error, eventually container should be empty.
    // We'll just await a short delay.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.firstChild).toBeNull();
  });
});
