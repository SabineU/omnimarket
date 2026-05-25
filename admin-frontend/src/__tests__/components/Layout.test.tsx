// admin-frontend/src/__tests__/components/Layout.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

vi.mock('../../hooks/useAuth');
vi.mock('../../hooks/useTheme');

function renderLayout(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<Layout />}>
          <Route path="/" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
    });
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', name: 'Admin', role: 'ADMIN' },
      logout: vi.fn(),
      isLoading: false,
      login: vi.fn(),
    });
  });

  it('renders header with admin name', () => {
    renderLayout();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('OmniMarket Admin')).toBeInTheDocument();
  });

  it('renders sidebar links', () => {
    renderLayout();
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-users')).toBeInTheDocument();
    expect(screen.getByTestId('nav-sellers')).toBeInTheDocument();
    expect(screen.getByTestId('nav-products')).toBeInTheDocument();
    expect(screen.getByTestId('nav-orders')).toBeInTheDocument();
  });

  it('renders child route content', () => {
    renderLayout();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('calls logout when logout button clicked', async () => {
    const logout = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', name: 'Admin', role: 'ADMIN' },
      logout,
      isLoading: false,
      login: vi.fn(),
    });
    renderLayout();

    await userEvent.click(screen.getByTestId('admin-logout-button'));
    expect(logout).toHaveBeenCalled();
  });

  it('calls toggleTheme when dark‑mode button clicked', async () => {
    const toggleTheme = vi.fn();
    (useTheme as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'light',
      toggleTheme,
    });
    renderLayout();

    await userEvent.click(screen.getByTestId('admin-dark-mode-toggle'));
    expect(toggleTheme).toHaveBeenCalled();
  });
});
