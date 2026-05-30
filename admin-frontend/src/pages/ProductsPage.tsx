// admin-frontend/src/pages/ProductsPage.tsx
// Admin product moderation queue – list products, filter by status,
// change any product's status, and view full product details in a modal.
import { useState } from 'react';
import {
  useAdminProducts,
  type AdminProduct,
  type AdminProductImage,
  type AdminProductVariation,
} from '../hooks/useAdminProducts';
import { useUpdateProductStatus } from '../hooks/useUpdateProductStatus';
import { Button, Spinner } from '../components/ui';
import Modal from '../components/ui/Modal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Colour badge for product status */
function statusBadge(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'INACTIVE':
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400';
    case 'DRAFT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

/**
 * Format a price for display.
 * Accepts both number and string (PostgreSQL returns Decimal as string)
 * and always returns a currency string like "$210.00".
 */
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Number.isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProductsPage(): React.JSX.Element {
  // ---- Filter state ----
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ---- Product list query ----
  const { data, isLoading, error } = useAdminProducts({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 10,
  });

  // ---- Status update mutation ----
  const updateStatus = useUpdateProductStatus();

  // ---- Per‑row status dropdown selections ----
  const [statusSelections, setStatusSelections] = useState<Record<string, string>>({});

  // ---- Detail modal state ----
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);

  // ---- Handlers ----
  const products = data?.data.products ?? [];
  const pagination = data?.data.pagination;

  /** Open the detail modal for a specific product */
  const openDetailModal = (product: AdminProduct): void => {
    setSelectedProduct(product);
    setStatusSelections((prev) => ({
      ...prev,
      [product.id]: product.status,
    }));
  };

  /** Close the detail modal */
  const closeDetailModal = (): void => {
    setSelectedProduct(null);
  };

  /** Send a PATCH request to update the product status */
  const handleUpdateStatus = (productId: string): void => {
    const newStatus =
      statusSelections[productId] ??
      products.find((p) => p.id === productId)?.status ??
      selectedProduct?.status ??
      'PENDING';
    updateStatus.mutate({ productId, status: newStatus });
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
      <div className="text-center py-16" data-testid="admin-products-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load products: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="admin-products-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Product Moderation {pagination ? `(${pagination.totalItems})` : ''}
      </h1>

      {/* ---- Filters ---- */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search by product name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="product-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="product-status-filter"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {/* ---- Table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="products-moderation-table">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Product
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Seller
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
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
                  onClick={() => openDetailModal(product)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                  data-testid={`product-row-${product.id}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${product.name}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {product.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {product.categoryName}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {product.sellerName || '—'}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(product.status)}`}
                    >
                      {product.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(product.basePrice)}
                  </td>

                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={statusSelections[product.id] ?? product.status}
                        onChange={(e) =>
                          setStatusSelections((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                        data-testid={`status-select-${product.id}`}
                        aria-label={`Change status for ${product.name}`}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(product.id)}
                        loading={updateStatus.isPending}
                        data-testid={`update-status-${product.id}`}
                      >
                        Update
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                data-testid="prev-page"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                data-testid="next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================
           PRODUCT DETAIL MODAL
           ================================================================== */}
      <Modal
        isOpen={selectedProduct !== null}
        onClose={closeDetailModal}
        ariaLabel="Product details"
      >
        {selectedProduct && (
          <div data-testid="product-detail-modal">
            {/* Product name */}
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              {selectedProduct.name}
            </h2>

            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(selectedProduct.status)}`}
            >
              {selectedProduct.status}
            </span>

            {/* Description */}
            {selectedProduct.description && (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                {selectedProduct.description}
              </p>
            )}

            {/* Meta: Brand, Category, Seller, Price */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {selectedProduct.brand && (
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Brand:</span>{' '}
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedProduct.brand}
                  </span>
                </div>
              )}
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Category:</span>{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedProduct.categoryName}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Seller:</span>{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedProduct.sellerName || '—'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Price:</span>{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(selectedProduct.basePrice)}
                </span>
              </div>
            </div>

            {/* Images – small thumbnails */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Images ({selectedProduct.images.length})
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedProduct.images.map(
                    (img: AdminProductImage, idx: number): React.JSX.Element => (
                      <img
                        key={img.id ?? idx}
                        src={img.url}
                        alt={img.altText}
                        className="h-20 w-20 rounded object-cover border border-neutral-200 dark:border-neutral-700"
                      />
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Variations */}
            {selectedProduct.variations && selectedProduct.variations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Variations ({selectedProduct.variations.length})
                </p>
                <ul className="space-y-1">
                  {selectedProduct.variations.map(
                    (v: AdminProductVariation, idx: number): React.JSX.Element => (
                      <li
                        key={v.id ?? idx}
                        className="text-xs text-neutral-600 dark:text-neutral-400 flex gap-2"
                      >
                        <span className="font-mono">{v.sku}</span>
                        {v.size && <span>Size: {v.size}</span>}
                        {v.color && <span>Color: {v.color}</span>}
                        <span>Stock: {v.stockQty}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {/* Status changer at the bottom of the modal */}
            <div className="mt-6 border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Update Status
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={statusSelections[selectedProduct.id] ?? selectedProduct.status}
                  onChange={(e) =>
                    setStatusSelections((prev) => ({
                      ...prev,
                      [selectedProduct.id]: e.target.value,
                    }))
                  }
                  className="rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  data-testid={`detail-status-select-${selectedProduct.id}`}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedProduct.id)}
                  loading={updateStatus.isPending}
                  data-testid={`detail-update-status-${selectedProduct.id}`}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ProductsPage;
