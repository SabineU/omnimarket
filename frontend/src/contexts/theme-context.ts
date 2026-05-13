// frontend/src/contexts/theme-context.ts
// Holds the ThemeContext definition and its TypeScript type.
// Separating the context from the provider satisfies React Fast Refresh.
import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {
    // intentionally empty
  },
});
