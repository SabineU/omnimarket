// frontend/src/hooks/useTheme.ts
// Custom hook to access the theme context (light/dark toggle).
import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '../contexts/theme-context';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a <ThemeProvider>');
  }
  return context;
}
