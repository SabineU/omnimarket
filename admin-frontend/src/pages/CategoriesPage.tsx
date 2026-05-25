// admin-frontend/src/pages/CategoriesPage.tsx
// Admin category manager – list, create, edit, delete categories.
// FIXED: removed unused imageUrl field from Zod schema.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminCategories, type AdminCategory } from '../hooks/useAdminCategories';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../hooks/useCategoryMutations';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Zod validation schema – slug is auto‑lowercased before validation
// ---------------------------------------------------------------------------
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug can only contain letters, numbers, and hyphens')
    .transform((val) => val.toLowerCase()),
  parentId: z.string().nullable().optional(),
  // imageUrl removed – not used in this phase
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Recursive category row
// ---------------------------------------------------------------------------
function CategoryRow({
  category,
  depth,
  onEdit,
  onDelete,
}: {
  category: AdminCategory;
  depth: number;
  onEdit: (cat: AdminCategory) => void;
  onDelete: (cat: AdminCategory) => void;
}): React.JSX.Element {
  return (
    <>
      <tr
        className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
        data-testid={`category-row-${category.id}`}
      >
        <td className="px-4 py-3" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {category.name}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            /{category.slug}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              data-testid={`edit-category-${category.id}`}
            >
              Edit
            </Button>
            <button
              type="button"
              onClick={() => onDelete(category)}
              className="text-sm font-medium text-error-500 hover:text-error-600 dark:text-error-400"
              data-testid={`delete-category-${category.id}`}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {category.children?.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function CategoriesPage(): React.JSX.Element {
  const { data, isLoading, error } = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const categories = data?.data.categories ?? [];

  const openCreate = (): void => {
    setEditingCategory(null);
    reset({ name: '', slug: '', parentId: null });
    setShowForm(true);
  };

  const openEdit = (cat: AdminCategory): void => {
    setEditingCategory(cat);
    reset({ name: cat.name, slug: cat.slug, parentId: cat.parentId });
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const onSubmit = (formData: CategoryFormValues): void => {
    const payload = {
      ...formData,
      parentId: formData.parentId || null,
    };

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, ...payload },
        { onSuccess: () => closeForm() },
      );
    } else {
      createCategory.mutate(payload, { onSuccess: () => closeForm() });
    }
  };

  const confirmDelete = (cat: AdminCategory): void => setDeletingCategory(cat);

  const handleDeleteConfirm = (): void => {
    if (deletingCategory) {
      deleteCategory.mutate(deletingCategory.id, {
        onSuccess: () => setDeletingCategory(null),
        onError: () => setDeletingCategory(null),
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
      <div className="text-center py-16" data-testid="admin-categories-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load categories: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="admin-categories-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Categories ({categories.length})
        </h1>
        <Button onClick={openCreate} size="sm" data-testid="add-category-button">
          + Add Category
        </Button>
      </div>

      {/* ---- Category tree table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <table className="w-full text-sm" data-testid="categories-table">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                Name
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                depth={0}
                onEdit={openEdit}
                onDelete={confirmDelete}
              />
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
            data-testid="category-form-backdrop"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </h2>

            {/* ---- Global form error banner ---- */}
            {Object.keys(errors).length > 0 && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-800 dark:bg-error-950">
                <p className="text-sm font-medium text-error-800 dark:text-error-200">
                  Please fix the errors below.
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              data-testid="category-form"
            >
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="category-form-name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-error-500" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Slug * <span className="text-neutral-400">(auto‑lowercased)</span>
                </label>
                <input
                  type="text"
                  {...register('slug')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="category-form-slug"
                />
                {errors.slug && (
                  <p className="mt-1 text-xs text-error-500" role="alert">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              {/* Parent */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Parent (optional)
                </label>
                <select
                  {...register('parentId')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid="category-form-parent"
                >
                  <option value="">None (top‑level)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="mt-1 text-xs text-error-500" role="alert">
                    {errors.parentId.message}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  data-testid="category-form-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} data-testid="category-form-submit">
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation modal ---- */}
      <ConfirmModal
        isOpen={deletingCategory !== null}
        onCancel={() => setDeletingCategory(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep category"
        isLoading={deleteCategory.isPending}
      />
    </div>
  );
}

export default CategoriesPage;
