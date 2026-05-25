// admin-frontend/src/__tests__/hooks/useTheme.test.tsx
// Unit tests for the useTheme hook.
import { describe, it, expect, beforeEach } from 'vitest'; // removed vi
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { useTheme } from '../../hooks/useTheme';

/**
 * Wrap the useTheme hook in its required ThemeProvider context.
 */
function renderThemeHook(): ReturnType<typeof renderHook<ReturnType<typeof useTheme>, unknown>> {
  return renderHook<ReturnType<typeof useTheme>, unknown>(() => useTheme(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    ),
  });
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light theme', () => {
    const { result } = renderThemeHook();
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles theme to dark', () => {
    const { result } = renderThemeHook();
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles back to light', () => {
    const { result } = renderThemeHook();
    act(() => {
      result.current.toggleTheme();
    }); // dark
    act(() => {
      result.current.toggleTheme();
    }); // light
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
