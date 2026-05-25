// admin-frontend/src/__tests__/pages/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthProvider';
import LoginPage from '../../pages/LoginPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderLogin(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByTestId('admin-login-form')).toBeInTheDocument();
    expect(screen.getByTestId('admin-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('admin-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('admin-login-button')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Invalid credentials'),
    );
    renderLogin();
    await userEvent.type(screen.getByTestId('admin-email-input'), 'admin@test.com');
    await userEvent.type(screen.getByTestId('admin-password-input'), 'wrong');
    await userEvent.click(screen.getByTestId('admin-login-button'));

    const errorMessage = await screen.findByText('Invalid credentials');
    expect(errorMessage).toBeInTheDocument();
  });
});
