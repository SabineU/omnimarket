// frontend/src/components/CookieBanner.tsx
// A fixed banner at the bottom of the screen informing users about cookies.
// Uses the useCookieConsent hook to manage visibility.
// Includes "Accept" and "Decline" buttons.
import { useCookieConsent } from '../hooks/useCookieConsent';
import { Button } from '../components/ui'; // our reusable Button component

function CookieBanner(): React.JSX.Element | null {
  const { isVisible, accept, decline } = useCookieConsent();

  // If the user already made a choice, don't render anything
  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 text-neutral-200 shadow-lg"
      data-testid="cookie-banner"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Message */}
        <p className="text-sm text-center sm:text-left max-w-2xl">
          We use cookies to enhance your browsing experience, serve personalised content, and
          analyse our traffic. By clicking &ldquo;Accept&rdquo; you consent to our use of cookies.{' '}
          <a
            href="/privacy"
            className="underline hover:text-white transition-colors"
            data-testid="cookie-policy-link"
          >
            Privacy Policy
          </a>
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={decline}
            data-testid="cookie-decline-button"
            className="border-neutral-500 text-neutral-200 hover:bg-neutral-700"
          >
            Decline
          </Button>
          <Button size="sm" onClick={accept} data-testid="cookie-accept-button">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CookieBanner;
