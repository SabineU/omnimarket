// admin-frontend/src/pages/CouponsPage.tsx
// Admin coupon management – list, create, edit, delete coupons.
// FIXED: replaced `any` cast with `unknown` cast to satisfy lint rule.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminCoupons, type AdminCoupon } from '../hooks/useAdminCoupons';
import {
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  type CreateCouponPayload,
} from '../hooks/useCouponMutations';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Zod schema – coupon form validation
// ---------------------------------------------------------------------------
const couponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only'),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number({ message: 'Value is required' }).positive('Value must be positive'),
  minCartAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

type CouponFormValues = z.infer<typeof couponSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function discountLabel(type: string, value: number): string {
  if (type === 'PERCENTAGE') return `${value}% off`;
  return `$${value.toFixed(2)} off`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function CouponsPage(): React.JSX.Element {
  const { data, isLoading, error } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<AdminCoupon | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
  });

  const coupons = data?.data.coupons ?? [];

  const openCreate = (): void => {
    setEditingCoupon(null);
    reset({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minCartAmount: null,
      usageLimit: null,
      expiresAt: '',
    });
    setShowForm(true);
  };

  const openEdit = (coupon: AdminCoupon): void => {
    setEditingCoupon(coupon);
    reset({
      code: coupon.code,
      discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: coupon.discountValue,
      minCartAmount: coupon.minCartAmount ?? null,
      usageLimit: coupon.usageLimit ?? null,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    setEditingCoupon(null);
  };

  // ---- Submit ----
  const onSubmit = (formData: CouponFormValues): void => {
    // Build a payload, removing null/empty fields so the backend Zod schema
    // passes validation.
    const rawPayload: Record<string, unknown> = {
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
    };

    for (const key of Object.keys(rawPayload)) {
      if (rawPayload[key] === null || rawPayload[key] === undefined || rawPayload[key] === '') {
        delete rawPayload[key];
      }
    }

    // Cast through `unknown` to avoid `any` (lint rule @typescript-eslint/no-explicit-any)
    const payload = rawPayload as unknown as CreateCouponPayload;

    if (editingCoupon) {
      updateCoupon.mutate({ id: editingCoupon.id, ...payload }, { onSuccess: () => closeForm() });
    } else {
      createCoupon.mutate(payload, { onSuccess: () => closeForm() });
    }
  };

  const confirmDelete = (coupon: AdminCoupon): void => setDeletingCoupon(coupon);

  const handleDeleteConfirm = (): void => {
    if (deletingCoupon) {
      deleteCoupon.mutate(deletingCoupon.id, {
        onSuccess: () => setDeletingCoupon(null),
        onError: () => setDeletingCoupon(null),
      });
    }
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="text-center py-16" data-testid="admin-coupons-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load coupons: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="admin-coupons-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Coupons ({coupons.length})
        </h1>
        <Button onClick={openCreate} size="sm" data-testid="add-coupon-button">
          + Add Coupon
        </Button>
      </div>

      {/* ---- Table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <table className="w-full text-sm" data-testid="coupons-table">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                Code
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                Discount
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                Used
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                Expires
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {coupons.map((coupon) => (
              <tr
                key={coupon.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                data-testid={`coupon-row-${coupon.id}`}
              >
                <td className="px-4 py-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {coupon.code}
                </td>
                <td className="px-4 py-3">
                  {discountLabel(coupon.discountType, coupon.discountValue)}
                </td>
                <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                  {coupon.usedCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                </td>
                <td className="px-4 py-3 text-center text-neutral-500 dark:text-neutral-400">
                  {formatDate(coupon.expiresAt)}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(coupon)}
                      data-testid={`edit-coupon-${coupon.id}`}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(coupon)}
                      className="text-sm font-medium text-error-500 hover:text-error-600 dark:text-error-400"
                      data-testid={`delete-coupon-${coupon.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Form Modal ---- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeForm}
            data-testid="coupon-form-backdrop"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingCoupon ? 'Edit Coupon' : 'New Coupon'}
            </h2>

            {Object.keys(errors).length > 0 && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-800 dark:bg-error-950">
                <p className="text-sm font-medium text-error-800 dark:text-error-200">
                  Please fix the errors below.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="coupon-form">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  {...register('code')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-code"
                />
                {errors.code && (
                  <p className="mt-1 text-xs text-error-500">{errors.code.message}</p>
                )}
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Discount Type *
                </label>
                <select
                  {...register('discountType')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-type"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed Amount</option>
                </select>
                {errors.discountType && (
                  <p className="mt-1 text-xs text-error-500">{errors.discountType.message}</p>
                )}
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Discount Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discountValue', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-value"
                />
                {errors.discountValue && (
                  <p className="mt-1 text-xs text-error-500">{errors.discountValue.message}</p>
                )}
              </div>

              {/* Min Cart Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Min Cart Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('minCartAmount', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-min-cart"
                />
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Usage Limit
                </label>
                <input
                  type="number"
                  {...register('usageLimit', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-usage-limit"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  {...register('expiresAt')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="coupon-form-expires"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  data-testid="coupon-form-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} data-testid="coupon-form-submit">
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation modal ---- */}
      <ConfirmModal
        isOpen={deletingCoupon !== null}
        onCancel={() => setDeletingCoupon(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon"
        message="Are you sure you want to delete this coupon? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep coupon"
        isLoading={deleteCoupon.isPending}
      />
    </div>
  );
}

export default CouponsPage;
