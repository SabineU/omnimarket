// frontend/src/__tests__/hooks/useCookieConsent.test.tsx
// Unit tests for the useCookieConsent hook.
// Verifies banner visibility based on localStorage content,
// and that accept/decline hide the banner and store a timestamp.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCookieConsent } from '../../hooks/useCookieConsent';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCookieHook(): ReturnType<
  typeof renderHook<ReturnType<typeof useCookieConsent>, unknown>
> {
  return renderHook<ReturnType<typeof useCookieConsent>, unknown>(() => useCookieConsent());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useCookieConsent', () => {
  // Clear localStorage before and after each test to isolate them
  beforeEach((): void => {
    localStorage.clear();
  });

  afterEach((): void => {
    localStorage.clear();
  });

  it('should show the banner by default (no stored consent)', (): void => {
    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(true);
  });

  it('should hide the banner if a valid future timestamp is stored', (): void => {
    // Simulate a consent that expires far in the future
    const future = Date.now() + 1000 * 60 * 60 * 24 * 400; // 400 days ahead
    localStorage.setItem('omnimarket_cookie_consent', JSON.stringify({ timestamp: future }));

    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(false);
  });

  it('should show the banner if the stored timestamp is expired', (): void => {
    // Simulate a consent that expired yesterday
    const past = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago
    localStorage.setItem('omnimarket_cookie_consent', JSON.stringify({ timestamp: past }));

    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(true);
  });

  it('should show the banner if localStorage contains invalid data', (): void => {
    localStorage.setItem('omnimarket_cookie_consent', 'not-json');
    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(true);
  });

  it('should hide the banner and store a timestamp after accept()', (): void => {
    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(true);

    act((): void => {
      result.current.accept();
    });

    expect(result.current.isVisible).toBe(false);

    // Check that a future timestamp was stored
    const stored = JSON.parse(localStorage.getItem('omnimarket_cookie_consent') ?? '{}') as {
      timestamp?: number;
    };
    expect(stored.timestamp).toBeGreaterThan(Date.now());
  });

  it('should hide the banner and store a timestamp after decline()', (): void => {
    const { result } = renderCookieHook();
    expect(result.current.isVisible).toBe(true);

    act((): void => {
      result.current.decline();
    });

    expect(result.current.isVisible).toBe(false);

    const stored = JSON.parse(localStorage.getItem('omnimarket_cookie_consent') ?? '{}') as {
      timestamp?: number;
    };
    expect(stored.timestamp).toBeGreaterThan(Date.now());
  });
});
