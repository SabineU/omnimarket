// admin-frontend/src/pages/ProductsPage.tsx
// Admin product moderation queue – list products, filter by status,
// and approve / reject pending products.
import { useState } from 'react';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useUpdateProductStatus } from '../hooks/useUpdateProductStatus';
import { Button, Spinner } from '../components/ui';

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

/** Format number as USD currency */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProductsPage(): React.JSX.Element {
  // Filter state
  const [statusFilter, setStatusFilter] = useState('PENDING'); // default to pending
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Product list query
  const { data, isLoading, error } = useAdminProducts({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 10,
  });

  // Approve / reject mutation
  const updateStatus = useUpdateProductStatus();

  // ---- Handlers ----
  const products = data?.data.products ?? [];
  const pagination = data?.data.pagination;

  const handleApprove = (productId: string): void => {
    updateStatus.mutate({ productId, status: 'ACTIVE' });
  };

  const handleReject = (productId: string): void => {
    updateStatus.mutate({ productId, status: 'INACTIVE' });
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
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  data-testid={`product-row-${product.id}`}
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
                    {product.sellerName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(product.status)}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(product.basePrice)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.status === 'PENDING' && (
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(product.id)}
                          loading={updateStatus.isPending}
                          data-testid={`approve-product-${product.id}`}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(product.id)}
                          loading={updateStatus.isPending}
                          data-testid={`reject-product-${product.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
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
    </div>
  );
}

export default ProductsPage;
