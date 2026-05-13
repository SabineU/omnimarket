// frontend/src/contexts/auth-context.ts
// Holds the AuthContext definition and its TypeScript types.
// Separating the context from the provider satisfies React Fast Refresh.
import { createContext } from 'react';

/** Shape of the user object returned by the API */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

/** Public interface exposed by the AuthContext */
export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
