// admin-frontend/src/__tests__/components/ProtectedRoute.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth');

function renderInRoutes(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading text when auth is loading', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, isLoading: true });
    render(<ProtectedRoute />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to login when user is null', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, isLoading: false });
    renderInRoutes();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to login when user is not admin', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', role: 'SELLER' },
      isLoading: false,
    });
    renderInRoutes();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', role: 'ADMIN' },
      isLoading: false,
    });
    renderInRoutes();
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
