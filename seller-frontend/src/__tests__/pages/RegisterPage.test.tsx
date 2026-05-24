// seller-frontend/src/__tests__/pages/RegisterPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthProvider';
import RegisterPage from '../../pages/RegisterPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderRegister(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </BrowserRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByTestId('seller-register-form')).toBeInTheDocument();
    expect(screen.getByTestId('seller-register-name')).toBeInTheDocument();
    expect(screen.getByTestId('seller-register-email')).toBeInTheDocument();
    expect(screen.getByTestId('seller-register-password')).toBeInTheDocument();
    expect(screen.getByTestId('seller-register-button')).toBeInTheDocument();
  });

  it('shows error on failed registration', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Registration failed'),
    );
    renderRegister();

    await userEvent.type(screen.getByTestId('seller-register-name'), 'Jane');
    await userEvent.type(screen.getByTestId('seller-register-email'), 'jane@test.com');
    await userEvent.type(screen.getByTestId('seller-register-password'), 'password');
    await userEvent.click(screen.getByTestId('seller-register-button'));

    const errorMessage = await screen.findByText('Registration failed');
    expect(errorMessage).toBeInTheDocument();
  });
});
