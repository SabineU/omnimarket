// frontend/src/components/checkout/AddressStep.tsx
// Step 1 of the checkout: shipping address selection.
// The user picks from their saved addresses, or is prompted to add one.
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Spinner } from '../ui';
import type { CheckoutFormValues } from '../../pages/CheckoutPage';

/** Shape of an address returned by the API */
interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressesResponse {
  status: string;
  data: {
    addresses: Address[];
  };
}

function AddressStep(): React.JSX.Element {
  // useFormContext gives us access to the form methods provided by the
  // FormProvider in the parent CheckoutPage.
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  // Fetch the user's saved addresses
  const { data, isLoading, error } = useQuery<AddressesResponse, Error>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await apiClient.get<AddressesResponse>('/users/me/addresses');
      return data;
    },
  });

  const addresses = data?.data.addresses ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return <p className="text-error-500">Failed to load addresses. Please try again.</p>;
  }

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Shipping Address
      </legend>

      {/* Validation error – shown after the user clicks Continue without selecting */}
      {errors.addressId && (
        <p className="text-error-500 text-sm mb-4" role="alert">
          {errors.addressId.message}
        </p>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            You have no saved addresses yet.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Please add one in your profile before continuing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className="flex items-start gap-3 rounded-lg border border-neutral-300 dark:border-neutral-600 p-4 cursor-pointer hover:border-primary-500 transition-colors"
              data-testid={`address-option-${addr.id}`}
            >
              <input
                type="radio"
                value={addr.id}
                {...register('addressId')}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 dark:bg-neutral-700 dark:border-neutral-500"
              />
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{addr.street}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {addr.city}, {addr.state} {addr.zipCode}, {addr.country}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

export default AddressStep;
