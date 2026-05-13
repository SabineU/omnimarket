// frontend/src/contexts/AuthProvider.tsx
// Provides authentication state (user, login, register, logout) to the entire app.
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient } from '../lib/api-client';
import { setTokens, clearTokens, getAccessToken } from '../lib/token-helper';
import { AuthContext, type AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore existing session on mount
  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      // No token – resolve immediately so that finally sets isLoading to false.
      // Using a promise chain keeps the setState call inside a callback, not directly in the effect.
      Promise.resolve().finally(() => setIsLoading(false));
      return;
    }

    apiClient
      .get<{ status: string; data: { user: AuthUser } }>('/users/me')
      .then((res) => {
        setUser(res.data.data.user);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{
      status: string;
      data: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
    }>('/auth/login', { email, password });

    const { user, tokens } = res.data.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(user);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role?: string }) => {
      const res = await apiClient.post<{
        status: string;
        data: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
      }>('/auth/register', data);

      const { user, tokens } = res.data.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
