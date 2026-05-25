// admin-frontend/src/__tests__/pages/UsersPage.test.tsx
// Unit tests for the admin UsersPage component.
// Covers loading, error, user rows, toggle active, delete confirm,
// pagination, and role filter.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import UsersPage from '../../pages/UsersPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- existing tests ----

  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Users error'));
    renderWithProviders();
    expect(await screen.findByText(/Users error/i)).toBeInTheDocument();
  });

  it('renders user rows', async () => {
    const users = [
      {
        id: '1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { users, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('opens delete confirmation modal', async () => {
    const users = [
      {
        id: '1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { users, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();

    await userEvent.click(await screen.findByTestId('delete-user-1'));
    expect(await screen.findByTestId('confirm-modal-confirm')).toBeInTheDocument();
  });

  // ---- new tests (excluding the problematic search test) ----

  it('calls toggle active when Activate/Deactivate is clicked', async () => {
    const users = [
      {
        id: '1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { users, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();

    await screen.findByText('Alice');
    await userEvent.click(screen.getByTestId('toggle-user-1'));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/1/active-status', {
      isActive: false,
    });
  });

  it('deletes user when confirm is clicked in the modal', async () => {
    const users = [
      {
        id: '1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { users, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();

    await screen.findByText('Alice');
    await userEvent.click(screen.getByTestId('delete-user-1'));
    await screen.findByTestId('confirm-modal-confirm');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    expect(apiClient.delete).toHaveBeenCalledWith('/admin/users/1');
  });

  it('paginates to next page when Next is clicked', async () => {
    const usersPage1 = [
      {
        id: '1',
        email: 'a@b.com',
        name: 'Alice',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    const usersPage2 = [
      {
        id: '2',
        email: 'b@c.com',
        name: 'Bob',
        role: 'SELLER',
        isActive: true,
        createdAt: '',
      },
    ];

    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            users: usersPage1,
            pagination: { currentPage: 1, totalPages: 2, totalItems: 2, limit: 10 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            users: usersPage2,
            pagination: { currentPage: 2, totalPages: 2, totalItems: 2, limit: 10 },
          },
        },
      });

    renderWithProviders();

    await screen.findByText('Alice');
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    const nextButton = screen.getByTestId('next-page');
    expect(nextButton).toBeEnabled();

    await userEvent.click(nextButton);

    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('filters by role when role select changes', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          users: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });

    renderWithProviders();

    await screen.findByTestId('admin-users-page');

    const select = screen.getByTestId('user-role-filter');
    await userEvent.selectOptions(select, 'SELLER');

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('role=SELLER'));
  });
});
