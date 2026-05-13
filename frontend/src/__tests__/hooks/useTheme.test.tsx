// frontend/src/__tests__/hooks/useTheme.test.tsx
// Unit test for the useTheme hook – verifies the toggle works.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { useTheme } from '../../hooks/useTheme';

// A dummy component that exposes theme via text
function TestComponent(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('useTheme', () => {
  // Clear localStorage before each test so they don't interfere
  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('should toggle to dark when button is clicked', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('should toggle back to light on second click', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );
    const button = screen.getByText('Toggle');
    await userEvent.click(button); // light → dark
    await userEvent.click(button); // dark → light
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });
});
