// frontend/src/components/StripeProvider.tsx
// Wraps its children with Stripe Elements, enabling secure card input.
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../lib/stripe';

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * This component must be placed above any component that uses
 * useStripe(), useElements(), or CardElement.
 */
function StripeProvider({ children }: StripeProviderProps): React.JSX.Element {
  return <Elements stripe={getStripe()}>{children}</Elements>;
}

export default StripeProvider;
