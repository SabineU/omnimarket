// frontend/src/__tests__/components/CookieBanner.test.tsx
// Unit tests for the CookieBanner component.
// Verifies it renders when visible and disappears after accept/decline.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CookieBanner from '../../components/CookieBanner';

// ---------------------------------------------------------------------------
// Helper: render with Router (needed for the privacy policy link)
// ---------------------------------------------------------------------------
function renderBanner(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <CookieBanner />
    </BrowserRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CookieBanner', () => {
  // Clear localStorage before each test so the banner always shows by default
  beforeEach((): void => {
    localStorage.clear();
  });

  it('renders the banner by default (no stored consent)', (): void => {
    renderBanner();
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument();
    expect(screen.getByTestId('cookie-accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('cookie-decline-button')).toBeInTheDocument();
    expect(screen.getByTestId('cookie-policy-link')).toBeInTheDocument();
  });

  it('hides after clicking the Accept button', async (): Promise<void> => {
    renderBanner();
    const acceptButton = screen.getByTestId('cookie-accept-button');
    await userEvent.click(acceptButton);

    // The banner should now be gone
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });

  it('hides after clicking the Decline button', async (): Promise<void> => {
    renderBanner();
    const declineButton = screen.getByTestId('cookie-decline-button');
    await userEvent.click(declineButton);

    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });

  it('does not render if consent was already stored', (): void => {
    // Pre-set a future timestamp
    const future = Date.now() + 1000 * 60 * 60 * 24 * 400;
    localStorage.setItem('omnimarket_cookie_consent', JSON.stringify({ timestamp: future }));

    renderBanner();

    // The banner should not appear
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });
});
