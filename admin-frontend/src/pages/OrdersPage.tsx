// admin-frontend/src/pages/OrdersPage.tsx
// Admin orders page – shows a table of all platform orders with status
// filter and pagination.  Replaces the old placeholder.
import { useState } from 'react';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tailwind badge colour for each order status */
function statusBadge(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'SHIPPED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'RETURN_REQUESTED':
    case 'RETURNED':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'PENDING':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
}

/** Format an ISO date to a readable local string */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a numeric string as USD currency */
function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return Number.isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
}

/** Convert UPPER_SNAKE_CASE to Title Case for display */
function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function OrdersPage(): React.JSX.Element {
  // ---- Filter & pagination state ----
  const [statusFilter, setStatusFilter] = useState(''); // '' = all
  const [page, setPage] = useState(1);

  // ---- Fetch orders ----
  const { data, isLoading, error } = useAdminOrders({
    status: statusFilter || undefined,
    page,
    limit: 10,
  });

  // ---- Handlers ----
  const orders = data?.data.orders ?? [];
  const pagination = data?.data.pagination;

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
      <div className="text-center py-16" data-testid="admin-orders-error">
        <p className="text-error-500 dark:text-error-400">Failed to load orders: {error.message}</p>
      </div>
    );
  }

  return (
    <div data-testid="admin-orders-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Orders {pagination ? `(${pagination.totalItems})` : ''}
      </h1>

      {/* ---- Filters ---- */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1); // reset to first page on filter change
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="order-status-filter"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURN_REQUESTED">Return Requested</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {/* ---- Table ---- */}
      {orders.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">No orders found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-orders-table">
              <thead className="bg-neutral-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    data-testid={`order-row-${order.id}`}
                  >
                    {/* Order ID (first 8 chars) */}
                    <td className="px-4 py-3 font-mono text-xs text-neutral-900 dark:text-neutral-100">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>

                    {/* Customer name + email */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {order.customer.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {order.customer.email}
                      </p>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatAmount(order.totalAmount)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(order.status)}`}
                        data-testid={`order-status-${order.id}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {formatDate(order.createdAt)}
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
      )}
    </div>
  );
}

export default OrdersPage;
