// seller-frontend/src/__tests__/components/ProtectedRoute.test.tsx
// Unit tests for the seller ProtectedRoute component.
// ProtectedRoute uses react-router's <Outlet />, so we must test it
// inside a proper <Routes> context, not with direct children.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth');

// Helper to render a simple route tree that includes ProtectedRoute
function renderInRoutes(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        {/* The login page is the redirect target */}
        <Route path="/login" element={<div>Login Page</div>} />

        {/* Protected route – renders ProtectedRoute as a layout, then the child route */}
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Secret Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading text when auth is still loading', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, isLoading: true });
    renderInRoutes();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when user is null', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, isLoading: false });
    renderInRoutes();
    // After redirect, the Login Page should be visible
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders the child route when user is a seller', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', role: 'SELLER' },
      isLoading: false,
    });
    renderInRoutes();
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});
