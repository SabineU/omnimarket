// frontend/src/components/checkout/AddressStep.tsx
// Step 1 of the checkout: shipping address selection.
// Allows the user to pick an existing address or add a new one inline.
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useAddresses, type Address } from '../../hooks/useAddresses';
import { useAddAddress } from '../../hooks/useAddAddress';
import { Spinner, Button } from '../ui';
import type { CheckoutFormValues } from '../../pages/CheckoutPage';

function AddressStep(): React.JSX.Element {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  const { data, isLoading, error } = useAddresses();
  const addresses: Address[] = data?.data.addresses ?? [];

  const addAddress = useAddAddress();

  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddAddress = async (): Promise<void> => {
    try {
      const result = await addAddress.mutateAsync(newAddress);
      // Auto‑select the newly created address
      setValue('addressId', result.data.address.id, { shouldValidate: true });
      setNewAddress({ street: '', city: '', state: '', zipCode: '', country: 'US' });
      setShowForm(false);
    } catch {
      // Error handled by addAddress.isError
    }
  };

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

      {/* Validation error (always visible) */}
      {errors.addressId && (
        <p className="text-error-500 text-sm mb-4" role="alert">
          {errors.addressId.message}
        </p>
      )}

      {/* Existing addresses */}
      {addresses.length > 0 && (
        <div className="space-y-3 mb-6">
          {addresses.map((addr: Address) => (
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

      {/* If no addresses, show message (but still allow adding one) */}
      {addresses.length === 0 && !showForm && (
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          You have no saved addresses yet.
        </p>
      )}

      {/* Inline add new address form */}
      {!showForm ? (
        <button
          type="button"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          onClick={() => setShowForm(true)}
          data-testid="add-address-button"
        >
          + Add new address
        </button>
      ) : (
        <div className="rounded-lg border border-neutral-300 dark:border-neutral-600 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            New Address
          </h4>
          <input
            name="street"
            placeholder="Street address"
            value={newAddress.street}
            onChange={handleChange}
            className="w-full rounded border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
            data-testid="new-address-street"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="city"
              placeholder="City"
              value={newAddress.city}
              onChange={handleChange}
              className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
              data-testid="new-address-city"
            />
            <input
              name="state"
              placeholder="State"
              value={newAddress.state}
              onChange={handleChange}
              className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
              data-testid="new-address-state"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="zipCode"
              placeholder="ZIP code"
              value={newAddress.zipCode}
              onChange={handleChange}
              className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
              data-testid="new-address-zip"
            />
            <input
              name="country"
              placeholder="Country"
              value={newAddress.country}
              onChange={handleChange}
              className="rounded border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
              data-testid="new-address-country"
            />
          </div>
          {addAddress.isError && (
            <p className="text-error-500 text-xs">Failed to add address. Please try again.</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={addAddress.isPending}
              onClick={handleAddAddress}
              data-testid="save-new-address-button"
            >
              Save Address
            </Button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

export default AddressStep;
