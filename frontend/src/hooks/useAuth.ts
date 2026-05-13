// frontend/src/hooks/useAuth.ts
// Custom hook to access the authentication context.
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/auth-context';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
