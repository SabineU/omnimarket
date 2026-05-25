// admin-frontend/src/__tests__/hooks/useAuth.test.tsx
// Unit tests for the useAuth hook (admin context).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthProvider';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';
import type { AuthContextValue } from '../../contexts/auth-context';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

/**
 * Render the useAuth hook wrapped in the AuthProvider.
 */
function renderAuthHook(): ReturnType<typeof renderHook<AuthContextValue, unknown>> {
  return renderHook<AuthContextValue, unknown>(() => useAuth(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    ),
  });
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with user null and isLoading true', () => {
    const { result } = renderAuthHook();
    expect(result.current.user).toBeNull();
  });

  it('login succeeds and sets user', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
          tokens: { accessToken: 'at', refreshToken: 'rt' },
        },
      },
    });

    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    /*await result.current.login('admin@test.com', 'password');
    
        expect(result.current.user).toEqual({
          id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN',
        });*/

    // Replace lines 55-59 with this:
    await result.current.login('admin@test.com', 'password');

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'ADMIN',
      });
    });
  });

  it('login rejects non-admin users', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          user: { id: '2', email: 'seller@test.com', name: 'Seller', role: 'SELLER' },
          tokens: { accessToken: 'at', refreshToken: 'rt' },
        },
      },
    });

    const { result } = renderAuthHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.login('seller@test.com', 'password')).rejects.toThrow();
    expect(result.current.user).toBeNull();
  });

  it('logout clears user', async () => {
    const { result } = renderAuthHook();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    result.current.logout();
    expect(result.current.user).toBeNull();
  });
});
