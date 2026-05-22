// seller-frontend/src/contexts/auth-context.ts
// Holds the AuthContext definition for the seller portal.
import { createContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>; // <-- added
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
