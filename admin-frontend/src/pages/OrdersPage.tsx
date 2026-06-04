// admin-frontend/src/pages/OrdersPage.tsx
// Admin orders page – shows a table of all platform orders with status
// filter, pagination, and a detail modal that opens when a row is clicked.
// UPDATED: detail modal now includes "Placed on" field.
import { useState } from 'react';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminOrderDetail } from '../hooks/useAdminOrderDetail';
import { Button, Spinner } from '../components/ui';
import Modal from '../components/ui/Modal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return Number.isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
}

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
  // Filter & pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Order list query
  const { data, isLoading, error } = useAdminOrders({
    status: statusFilter || undefined,
    page,
    limit: 10,
  });

  // ---- Detail modal state ----
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch full order detail when an order is selected
  const { data: detailData, isLoading: detailLoading } = useAdminOrderDetail(selectedOrderId);

  const orderDetail = detailData?.data?.order;

  const orders = data?.data.orders ?? [];
  const pagination = data?.data.pagination;

  const closeDetail = (): void => setSelectedOrderId(null);

  // ---- Loading state (list) ----
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
            setPage(1);
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
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                    data-testid={`order-row-${order.id}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for order ${order.id}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-neutral-900 dark:text-neutral-100">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {order.customer.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {order.customer.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatAmount(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(order.status)}`}
                        data-testid={`order-status-${order.id}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
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

      {/* ==================================================================
           ORDER DETAIL MODAL
           ================================================================== */}
      <Modal isOpen={selectedOrderId !== null} onClose={closeDetail} ariaLabel="Order details">
        {/* Loading state inside modal */}
        {detailLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        )}

        {/* Detail content */}
        {!detailLoading && orderDetail && (
          <div data-testid="order-detail-modal">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Order #{orderDetail.id.slice(0, 8).toUpperCase()}
            </h2>

            {/* Status & date */}
            <div className="flex items-center gap-3 mb-4 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(orderDetail.status)}`}
              >
                {formatStatus(orderDetail.status)}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {formatDate(orderDetail.createdAt)}
              </span>
            </div>

            {/* Customer info + Placed on */}
            <div className="mb-4 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-sm">
              <p>
                <span className="font-medium">Customer:</span> {orderDetail.customer.name} (
                {orderDetail.customer.email})
              </p>
              <p className="mt-1">
                <span className="font-medium">Total:</span> {formatAmount(orderDetail.totalAmount)}
              </p>
              {/* NEW: explicitly show when the order was first placed */}
              <p className="mt-1">
                <span className="font-medium">Placed on:</span> {formatDate(orderDetail.createdAt)}
              </p>
            </div>

            {/* Items list */}
            <h3 className="text-sm font-semibold mb-2">Items ({orderDetail.items.length})</h3>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {orderDetail.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 text-sm border-b border-neutral-100 dark:border-neutral-700 pb-3"
                  data-testid={`detail-item-${item.id}`}
                >
                  {/* Product image */}
                  <div className="h-12 w-12 shrink-0 rounded bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    {item.variation && (
                      <p className="text-xs text-neutral-500">
                        {[item.variation.size, item.variation.color].filter(Boolean).join(' / ') ||
                          item.variation.sku}
                      </p>
                    )}
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-neutral-500">Qty: {item.quantity}</span>
                      <span className="font-semibold">
                        ${parseFloat(item.priceAtTime).toFixed(2)}
                      </span>
                    </div>
                    {/* Seller name */}
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Sold by: {item.product.seller.storeName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error or empty state inside modal */}
        {!detailLoading && !orderDetail && (
          <p className="text-neutral-500 text-center py-4">Could not load order details.</p>
        )}
      </Modal>
    </div>
  );
}

export default OrdersPage;
