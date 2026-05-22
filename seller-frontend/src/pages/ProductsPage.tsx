// seller-frontend/src/pages/ProductsPage.tsx
// Seller product management page – list, create, edit, delete, and CSV import.
// FIXED: dark‑mode hover colour uses an existing Tailwind token.
import { useState } from 'react';
import { useSellerProducts, type SellerProduct } from '../hooks/useSellerProducts';
import { useDeleteProduct, useCreateProduct } from '../hooks/useProductMutations';
import { Button, Spinner } from '../components/ui';
import ProductFormModal from '../components/ProductFormModal';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a product status to a Tailwind badge colour */
function statusBadge(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'INACTIVE':
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProductsPage(): React.JSX.Element {
  const { data, isLoading, error } = useSellerProducts();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // CSV import loading
  const [csvLoading, setCsvLoading] = useState(false);

  // ---- Handlers ----
  const products = data?.data.products ?? [];

  const openCreate = (): void => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (product: SellerProduct): void => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const confirmDelete = (id: string): void => setDeletingId(id);
  const handleDelete = (): void => {
    if (deletingId) {
      deleteProduct.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
    }
  };

  // ---- CSV import ----
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    const reader = new FileReader();

    reader.onload = async (): Promise<void> => {
      const text = reader.result as string;
      const lines = text.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        setCsvLoading(false);
        return;
      }

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf('name');
      const descIdx = header.indexOf('description');
      const priceIdx = header.indexOf('price');
      const categoryIdx = header.indexOf('categoryid');

      if (nameIdx === -1 || priceIdx === -1) {
        setCsvLoading(false);
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        try {
          await createProduct.mutateAsync({
            name: cols[nameIdx] || 'Untitled',
            description: cols[descIdx] || 'No description.',
            categoryId: cols[categoryIdx] || '',
            basePrice: parseFloat(cols[priceIdx]) || 0,
            variations: [],
            images: [],
          });
        } catch {
          // Continue with next row even if one fails
        }
      }

      setCsvLoading(false);
    };

    reader.readAsText(file);
    e.target.value = '';
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
      <div className="text-center py-16" data-testid="seller-products-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load products: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="seller-products-page">
      {/* ---- Header row ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Products ({products.length})
        </h1>
        <div className="flex gap-3">
          {/* CSV Import */}
          <label
            className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 px-3 py-1.5 text-sm cursor-pointer ${
              csvLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            data-testid="csv-import-button"
          >
            {csvLoading ? 'Importing…' : 'Import CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              disabled={csvLoading}
              className="hidden"
              data-testid="csv-file-input"
            />
          </label>

          {/* Add Product */}
          <Button onClick={openCreate} size="sm" data-testid="add-product-button">
            + Add Product
          </Button>
        </div>
      </div>

      {/* ---- Product list ---- */}
      {products.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">
            You haven&apos;t listed any products yet.
          </p>
          <Button onClick={openCreate} className="mt-4">
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
          <table className="w-full text-sm" data-testid="products-table">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Product
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                  Price
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  data-testid={`product-row-${product.id}`}
                >
                  {/* Name + image count */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {product.name}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {product.images.length} image{product.images.length !== 1 ? 's' : ''}
                      {' · '}
                      {product.variations.length} variation
                      {product.variations.length !== 1 ? 's' : ''}
                    </p>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(product.status)}`}
                      data-testid={`product-status-${product.id}`}
                    >
                      {product.status}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    ${Number(product.basePrice).toFixed(2)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                        data-testid={`edit-product-${product.id}`}
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(product.id)}
                        className="text-sm font-medium text-error-500 hover:text-error-600 dark:text-error-400"
                        data-testid={`delete-product-${product.id}`}
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
      )}

      {/* ---- Product form modal ---- */}
      <ProductFormModal isOpen={showForm} onClose={closeForm} existingProduct={editingProduct} />

      {/* ---- Delete confirmation modal ---- */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep product"
        isLoading={deleteProduct.isPending}
      />
    </div>
  );
}

export default ProductsPage;
