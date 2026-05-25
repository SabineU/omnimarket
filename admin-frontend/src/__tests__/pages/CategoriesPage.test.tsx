// admin-frontend/src/__tests__/pages/CategoriesPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CategoriesPage from '../../pages/CategoriesPage';
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
        <CategoriesPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('CategoriesPage', () => {
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
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Categories error'),
    );
    renderWithProviders();
    expect(await screen.findByText(/Categories error/i)).toBeInTheDocument();
  });

  it('renders category rows', async () => {
    const categories = [
      { id: '1', name: 'Electronics', slug: 'electronics', parentId: null, children: [] },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { categories } },
    });
    renderWithProviders();
    expect(await screen.findByText('Electronics')).toBeInTheDocument();
  });

  it('opens the create category modal', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { categories: [] } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('add-category-button'));
    expect(await screen.findByTestId('category-form-backdrop')).toBeInTheDocument();
  });

  it('opens the edit category modal', async () => {
    const categories = [
      { id: '1', name: 'Electronics', slug: 'electronics', parentId: null, children: [] },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { categories } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('edit-category-1'));
    expect(await screen.findByTestId('category-form-backdrop')).toBeInTheDocument();
  });

  it('calls delete mutation when confirm is clicked', async () => {
    const categories = [
      { id: '1', name: 'Electronics', slug: 'electronics', parentId: null, children: [] },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { categories } },
    });
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();

    await userEvent.click(await screen.findByTestId('delete-category-1'));
    await userEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    expect(apiClient.delete).toHaveBeenCalledWith('/admin/categories/1');
  });
});
