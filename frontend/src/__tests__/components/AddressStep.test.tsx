// frontend/src/__tests__/components/AddressStep.test.tsx
// Unit tests for the AddressStep checkout component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import AddressStep from '../../components/checkout/AddressStep';
import { useAddresses } from '../../hooks/useAddresses';
import { useAddAddress } from '../../hooks/useAddAddress';

vi.mock('../../hooks/useAddresses');
vi.mock('../../hooks/useAddAddress');

// ---------------------------------------------------------------------------
// Test wrapper – provides React Query and React Hook Form contexts
// ---------------------------------------------------------------------------
function TestWrapper(): React.JSX.Element {
  const methods = useForm({ defaultValues: { addressId: '' } });
  return (
    <QueryClientProvider client={new QueryClient()}>
      <FormProvider {...methods}>
        <AddressStep />
      </FormProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Helpers to build standard mock return values
// ---------------------------------------------------------------------------
const emptyAddresses = {
  data: { data: { addresses: [] } },
  isLoading: false,
  error: null,
};

const defaultAddAddressMock = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({
    data: { address: { id: 'new-addr' } },
  }),
  isPending: false,
  isError: false,
};

describe('AddressStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set safe defaults for both hooks
    (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue(emptyAddresses);
    (useAddAddress as ReturnType<typeof vi.fn>).mockReturnValue(defaultAddAddressMock);
  });

  // ---- Existing tests ----

  it('shows loading spinner', () => {
    (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { container } = render(<TestWrapper />);
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows no addresses message and add button', () => {
    render(<TestWrapper />);
    expect(screen.getByText('You have no saved addresses yet.')).toBeInTheDocument();
    expect(screen.getByText('+ Add new address')).toBeInTheDocument();
  });

  it('displays existing addresses and allows selection', async () => {
    const addresses = [
      {
        id: 'a1',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'US',
        isDefault: true,
      },
    ];
    (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: { addresses } },
      isLoading: false,
      error: null,
    });

    render(<TestWrapper />);

    const label = screen.getByTestId('address-option-a1');
    const radio = label.querySelector('input[type="radio"]') as HTMLInputElement;

    await userEvent.click(label);
    expect(radio).toBeChecked();
  });

  it('shows error message when addresses fail to load', () => {
    (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    });

    render(<TestWrapper />);
    expect(screen.getByText('Failed to load addresses. Please try again.')).toBeInTheDocument();
  });

  it('opens the new address form when "+ Add new address" is clicked', async () => {
    render(<TestWrapper />);

    await userEvent.click(screen.getByText('+ Add new address'));

    expect(screen.getByTestId('new-address-street')).toBeInTheDocument();
    expect(screen.getByTestId('new-address-city')).toBeInTheDocument();
    expect(screen.getByTestId('save-new-address-button')).toBeInTheDocument();
  });

  // ---- FIXED: use clear() before typing into country field ----
  it('calls the addAddress mutation when saving a new address', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue({
      data: { address: { id: 'new-addr' } },
    });

    (useAddAddress as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultAddAddressMock,
      mutateAsync: mutateAsyncMock,
    });

    render(<TestWrapper />);

    // Open the form
    await userEvent.click(screen.getByText('+ Add new address'));

    // Fill in required fields
    await userEvent.type(screen.getByTestId('new-address-street'), '789 Pine St');
    await userEvent.type(screen.getByTestId('new-address-city'), 'Villagetown');
    await userEvent.type(screen.getByTestId('new-address-state'), 'VT');
    await userEvent.type(screen.getByTestId('new-address-zip'), '00000');

    // The country field already contains "US", so clear it first
    const countryInput = screen.getByTestId('new-address-country');
    await userEvent.clear(countryInput);
    await userEvent.type(countryInput, 'US');

    // Click Save Address
    await userEvent.click(screen.getByTestId('save-new-address-button'));

    // The mutation should have been called with the form data
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      street: '789 Pine St',
      city: 'Villagetown',
      state: 'VT',
      zipCode: '00000',
      country: 'US',
    });
  });
});
