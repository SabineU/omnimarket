// seller-frontend/src/contexts/AuthProvider.tsx
// Provides auth state to the seller portal.
// Only allows users with role SELLER or ADMIN to proceed.
// Now exposes a `register` function so new sellers can create an account.
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
        const fetchedUser = res.data.data.user;
        // Only allow sellers and admins to use this portal
        if (fetchedUser.role !== 'SELLER' && fetchedUser.role !== 'ADMIN') {
          clearTokens();
          setUser(null);
        } else {
          setUser(fetchedUser);
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
    if (loggedInUser.role !== 'SELLER' && loggedInUser.role !== 'ADMIN') {
      throw new Error('Only sellers can access this portal.');
    }
    setTokens(tokens.accessToken);
    setUser(loggedInUser);
  }, []);

  // New: register a seller account
  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiClient.post<{
      status: string;
      data: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
    }>('/auth/register', { email, password, name, role: 'SELLER' });
    const { user: registeredUser, tokens } = res.data.data;
    setTokens(tokens.accessToken);
    setUser(registeredUser);
  }, []);

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
