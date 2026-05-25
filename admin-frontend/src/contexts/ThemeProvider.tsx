// admin-frontend/src/contexts/ThemeProvider.tsx
// Provides a light/dark theme toggle for the entire admin application.
// The user's preference is stored in localStorage and applied to the <html> element.
import { useState, useEffect, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme-context';

/**
 * Provider component that reads/writes the theme preference.
 * It adds or removes the 'dark' class on the root <html> element,
 * which activates Tailwind's dark: variants globally.
 */
export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    }
    return 'light';
  });

  // Apply the 'dark' class to the root <html> element whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
