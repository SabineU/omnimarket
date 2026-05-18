// frontend/src/pages/ProfilePage.tsx
// Profile page – allows the user to edit their name and manage saved addresses.
// Addresses can be added, edited inline, deleted, and set as default.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useAddresses, type Address } from '../hooks/useAddresses';
import { useAddAddress } from '../hooks/useAddAddress';
import { useUpdateAddress } from '../hooks/useUpdateAddress';
import { useDeleteAddress } from '../hooks/useDeleteAddress';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Zod schema for the profile form
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Zod schema for the address form (shared by add and edit)
// ---------------------------------------------------------------------------
const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
});

type AddressFormValues = z.infer<typeof addressSchema>;

// ---------------------------------------------------------------------------
// Empty address form defaults
// ---------------------------------------------------------------------------
const EMPTY_ADDRESS: AddressFormValues = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProfilePage(): React.JSX.Element {
  // ---- Profile section ----
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = profileData?.data.user;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '' },
  });

  const handleProfileSubmit = (formData: ProfileFormValues): void => {
    updateProfile.mutate({ name: formData.name });
  };

  // ---- Addresses section ----
  const { data: addressesData, isLoading: addressesLoading } = useAddresses();
  const addAddress = useAddAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const addresses = addressesData?.data.addresses ?? [];

  // State for the inline "add address" form
  const [showAddForm, setShowAddForm] = useState(false);
  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY_ADDRESS,
  });

  // State for editing an existing address
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const editForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  // State for delete confirmation modal
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // ---- Address handlers ----

  const handleAddAddress = (formData: AddressFormValues): void => {
    addAddress.mutate(formData, {
      onSuccess: () => {
        setShowAddForm(false);
        addressForm.reset(EMPTY_ADDRESS);
      },
    });
  };

  const startEditing = (addr: Address): void => {
    setEditingAddressId(addr.id);
    editForm.reset({
      street: addr.street,
      city: addr.city,
      state: addr.state ?? '',
      zipCode: addr.zipCode,
      country: addr.country,
    });
  };

  const cancelEditing = (): void => {
    setEditingAddressId(null);
    editForm.reset(EMPTY_ADDRESS);
  };

  const handleEditSubmit = (formData: AddressFormValues): void => {
    if (!editingAddressId) return;
    updateAddress.mutate(
      { addressId: editingAddressId, data: formData },
      {
        onSuccess: () => {
          setEditingAddressId(null);
          editForm.reset(EMPTY_ADDRESS);
        },
      },
    );
  };

  const handleSetDefault = (addr: Address): void => {
    // PATCH the address with isDefault: true
    updateAddress.mutate({
      addressId: addr.id,
      data: { isDefault: true },
    });
  };

  const confirmDelete = (addressId: string): void => {
    setDeletingAddressId(addressId);
  };

  const handleDeleteConfirm = (): void => {
    if (deletingAddressId) {
      deleteAddress.mutate(deletingAddressId, {
        onSuccess: () => setDeletingAddressId(null),
        onError: () => setDeletingAddressId(null),
      });
    }
  };

  const handleDeleteDismiss = (): void => {
    setDeletingAddressId(null);
  };

  // ---- Loading state ----
  if (profileLoading || addressesLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="profile-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">
        Your Profile
      </h1>

      {/* ================================================================= */}
      {/* Profile Editor                                                    */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Personal Information
        </h2>

        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
          {/* Email – read only */}
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="w-full rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 cursor-not-allowed"
              data-testid="profile-email-input"
            />
          </div>

          {/* Name – editable */}
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              {...profileForm.register('name')}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              data-testid="profile-name-input"
            />
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-xs text-error-500" role="alert">
                {profileForm.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfile.isPending}
              disabled={!profileForm.formState.isDirty}
              data-testid="profile-save-button"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* ================================================================= */}
      {/* Address Manager                                                   */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Saved Addresses ({addresses.length})
          </h2>
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              data-testid="add-address-button"
            >
              + Add Address
            </Button>
          )}
        </div>

        {/* ---- Inline Add Address Form ---- */}
        {showAddForm && (
          <form
            onSubmit={addressForm.handleSubmit(handleAddAddress)}
            className="mb-6 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-950"
            data-testid="add-address-form"
          >
            <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-3">
              New Address
            </h3>
            <div className="space-y-3">
              <input
                {...addressForm.register('street')}
                placeholder="Street address"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                data-testid="new-address-street"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  {...addressForm.register('city')}
                  placeholder="City"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="new-address-city"
                />
                <input
                  {...addressForm.register('state')}
                  placeholder="State"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="new-address-state"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  {...addressForm.register('zipCode')}
                  placeholder="ZIP code"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="new-address-zip"
                />
                <input
                  {...addressForm.register('country')}
                  placeholder="Country"
                  className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="new-address-country"
                />
              </div>
              {addAddress.isError && (
                <p className="text-xs text-error-500">Failed to add address. Please try again.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    addressForm.reset(EMPTY_ADDRESS);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={addAddress.isPending}
                  data-testid="save-new-address-button"
                >
                  Save Address
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* ---- Address List ---- */}
        {addresses.length === 0 && !showAddForm ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">
            You have no saved addresses yet.
          </p>
        ) : (
          <ul
            className="divide-y divide-neutral-100 dark:divide-neutral-700"
            data-testid="address-list"
          >
            {addresses.map((addr: Address) => (
              <li
                key={addr.id}
                className="py-4 first:pt-0 last:pb-0"
                data-testid={`address-item-${addr.id}`}
              >
                {/* If this address is being edited, show the edit form */}
                {editingAddressId === addr.id ? (
                  <form
                    onSubmit={editForm.handleSubmit(handleEditSubmit)}
                    className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
                    data-testid={`edit-address-form-${addr.id}`}
                  >
                    <input
                      {...editForm.register('street')}
                      placeholder="Street address"
                      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                      data-testid={`edit-address-street-${addr.id}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        {...editForm.register('city')}
                        placeholder="City"
                        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                        data-testid={`edit-address-city-${addr.id}`}
                      />
                      <input
                        {...editForm.register('state')}
                        placeholder="State"
                        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                        data-testid={`edit-address-state-${addr.id}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        {...editForm.register('zipCode')}
                        placeholder="ZIP code"
                        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                        data-testid={`edit-address-zip-${addr.id}`}
                      />
                      <input
                        {...editForm.register('country')}
                        placeholder="Country"
                        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                        data-testid={`edit-address-country-${addr.id}`}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        loading={updateAddress.isPending}
                        data-testid={`save-edit-address-${addr.id}`}
                      >
                        Save
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Display mode */
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {addr.street}
                          {addr.isDefault && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {addr.city}, {addr.state} {addr.zipCode}, {addr.country}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        onClick={() => startEditing(addr)}
                        data-testid={`edit-address-button-${addr.id}`}
                      >
                        Edit
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          onClick={() => handleSetDefault(addr)}
                          data-testid={`set-default-address-${addr.id}`}
                        >
                          Set as default
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs font-medium text-error-500 hover:text-error-600 dark:text-error-400"
                        onClick={() => confirmDelete(addr.id)}
                        data-testid={`delete-address-button-${addr.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Delete Address Confirmation Modal ---- */}
      <ConfirmModal
        isOpen={deletingAddressId !== null}
        onCancel={handleDeleteDismiss}
        onConfirm={handleDeleteConfirm}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep address"
        isLoading={deleteAddress.isPending}
      />
    </div>
  );
}

export default ProfilePage;
