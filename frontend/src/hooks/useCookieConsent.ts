// frontend/src/hooks/useCookieConsent.ts
// Custom hook that manages the cookie consent banner visibility.
// Stores the user's choice in localStorage so the banner never
// reappears after they accept or decline.
import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key that records the user's consent decision */
const STORAGE_KEY = 'omnimarket_cookie_consent';

/** How many days the consent should be remembered (365 = one year) */
const CONSENT_EXPIRY_DAYS = 365;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CookieConsentState {
  /** Whether the banner should be visible right now */
  isVisible: boolean;
  /** Call when the user clicks "Accept" – saves consent and hides the banner */
  accept: () => void;
  /** Call when the user clicks "Decline" – records refusal and hides the banner */
  decline: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the cookie consent banner.
 *
 * On first render it checks localStorage – if the user already accepted
 * or declined, the banner is hidden.  Otherwise it's shown.
 *
 * The accept/decline functions persist the decision to localStorage
 * with an expiry timestamp so the banner stays hidden for at least
 * CONSENT_EXPIRY_DAYS.
 */
export function useCookieConsent(): CookieConsentState {
  // Lazy initializer – reads localStorage once
  const [isVisible, setIsVisible] = useState<boolean>((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return true; // no stored decision → show banner

      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'timestamp' in parsed &&
        typeof (parsed as Record<string, unknown>).timestamp === 'number'
      ) {
        const expiryDate = new Date((parsed as { timestamp: number }).timestamp);
        // If the stored timestamp is in the future, the consent is still valid
        if (expiryDate.getTime() > Date.now()) {
          return false; // already decided – don't show the banner
        }
      }
    } catch {
      // If anything goes wrong (e.g., corrupted data), show the banner
    }
    return true; // no valid consent found → show banner
  });

  // Persist the user's choice (accept or decline) and hide the banner.
  // We store a timestamp CONSENT_EXPIRY_DAYS into the future so the
  // banner stays hidden for a year.
  const saveDecision = useCallback((): void => {
    try {
      const expiryTimestamp = Date.now() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: expiryTimestamp }));
    } catch {
      // localStorage might be full or disabled – fail silently
    }
    setIsVisible(false);
  }, []);

  // Public API – both accept and decline do the same thing: hide the banner.
  // In a production app you'd also configure analytics/tracking based on the
  // choice (e.g., only load Google Analytics after accept).
  const accept = useCallback((): void => {
    saveDecision();
    // Placeholder for future analytics consent
  }, [saveDecision]);

  const decline = useCallback((): void => {
    saveDecision();
    // In production: disable tracking scripts, set a "denied" flag
  }, [saveDecision]);

  return { isVisible, accept, decline };
}
