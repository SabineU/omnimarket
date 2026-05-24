// seller-frontend/src/pages/ProfilePage.tsx
// Seller profile page – allows the seller to view and edit their store profile.
// FIXED: uses correct endpoints /seller/profile (GET) and PUT /seller/profile.
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../lib/api-client';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Zod validation schema for the store profile form
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters'),
  description: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Profile data shape returned by the API
// ---------------------------------------------------------------------------
interface SellerProfile {
  storeName: string;
  description: string | null;
  isApproved: boolean;
}

interface ProfileResponse {
  status: string;
  data: {
    profile: SellerProfile;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProfilePage(): React.JSX.Element {
  // Loading and error states for the profile fetch
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  // Fetch the seller's existing profile on mount
  useEffect(() => {
    apiClient
      .get<ProfileResponse>('/seller/profile') // <-- fixed URL
      .then((res) => {
        const p = res.data.data.profile;
        setProfile(p);
        // Pre‑fill the form with existing data
        reset({ storeName: p.storeName, description: p.description ?? '' });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setFetchError(message);
      })
      .finally(() => setLoading(false));
  }, [reset]);

  // Submit the updated profile
  const onSubmit = async (data: ProfileFormValues): Promise<void> => {
    try {
      const res = await apiClient.put<ProfileResponse>('/seller/profile', data); // <-- fixed URL & method
      const updated = res.data.data.profile;
      setProfile(updated);
      reset({ storeName: updated.storeName, description: updated.description ?? '' });
      // Optionally show a toast – we'll keep it simple for now
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      alert(message); // replace with toast in a later phase
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---- Fetch error ----
  if (fetchError) {
    return (
      <div className="text-center py-16" data-testid="seller-profile-error">
        <p className="text-error-500">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="seller-profile-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Store Profile
      </h1>

      {/* Approval status banner */}
      {profile && !profile.isApproved && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950"
          data-testid="seller-pending-banner"
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Your store is pending approval.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            You can edit your profile, but you won&apos;t be able to list products until an admin
            approves your account.
          </p>
        </div>
      )}

      {/* Profile form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 space-y-4"
        data-testid="seller-profile-form"
      >
        {/* Store name */}
        <div>
          <label
            htmlFor="storeName"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Store Name
          </label>
          <input
            id="storeName"
            type="text"
            {...register('storeName')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            data-testid="seller-profile-storename"
          />
          {errors.storeName && (
            <p className="mt-1 text-xs text-error-500" role="alert">
              {errors.storeName.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            data-testid="seller-profile-description"
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isDirty}
            data-testid="seller-profile-save"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
