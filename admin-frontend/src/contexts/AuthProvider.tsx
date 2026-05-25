// admin-frontend/src/contexts/AuthProvider.tsx
// Provides auth state to the admin panel.
// Only allows users with role ADMIN to proceed.
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient, setTokens, clearTokens, getAccessToken } from '../lib/api-client';
import { AuthContext, type AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore existing session on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<{ status: string; data: { user: AuthUser } }>('/users/me')
      .then((res) => {
        const u = res.data.data.user;
        if (u.role !== 'ADMIN') {
          clearTokens();
          setUser(null);
        } else {
          setUser(u);
        }
      })
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{
      status: string;
      data: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
    }>('/auth/login', { email, password });
    const { user: loggedInUser, tokens } = res.data.data;
    if (loggedInUser.role !== 'ADMIN') {
      throw new Error('Only administrators can access this panel.');
    }
    setTokens(tokens.accessToken);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
