// seller-frontend/src/pages/OrdersPage.tsx
// Seller order fulfillment page – list orders and update their status.
// Supports confirming and shipping with a tracking number.
import { useState } from 'react';
import { useSellerOrders, type SellerOrder } from '../hooks/useSellerOrders';
import { useUpdateOrderStatus } from '../hooks/useUpdateOrderStatus';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map an order status to a Tailwind badge colour */
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
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

/** Format an ISO date string to a readable local date */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function OrdersPage(): React.JSX.Element {
  const { data, isLoading, error } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();

  // State for confirm/ship confirmation modal
  const [confirmTarget, setConfirmTarget] = useState<{
    order: SellerOrder;
    action: 'CONFIRMED' | 'SHIPPED';
  } | null>(null);

  // State for tracking number input (shown inline)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  // ---- Handlers ----
  const orders = data?.data.orders ?? [];

  const openConfirmModal = (order: SellerOrder, action: 'CONFIRMED' | 'SHIPPED'): void => {
    // If shipping, first ask for tracking number
    if (action === 'SHIPPED') {
      setTrackingOrderId(order.id);
      setTrackingNumber('');
      return;
    }
    // For confirm, open the confirmation modal directly
    setConfirmTarget({ order, action });
  };

  const handleConfirmAction = (): void => {
    if (!confirmTarget) return;
    updateStatus.mutate(
      { orderId: confirmTarget.order.id, status: confirmTarget.action },
      { onSuccess: () => setConfirmTarget(null) },
    );
  };

  const handleShipWithTracking = (): void => {
    if (!trackingOrderId || !trackingNumber.trim()) return;
    updateStatus.mutate(
      {
        orderId: trackingOrderId,
        status: 'SHIPPED',
        trackingNumber: trackingNumber.trim(),
      },
      { onSuccess: () => setTrackingOrderId(null) },
    );
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
      <div className="text-center py-16" data-testid="seller-orders-error">
        <p className="text-error-500 dark:text-error-400">Failed to load orders: {error.message}</p>
      </div>
    );
  }

  return (
    <div data-testid="seller-orders-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Orders ({orders.length})
      </h1>

      {/* ---- Empty state ---- */}
      {orders.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">No orders yet for your products.</p>
        </div>
      )}

      {/* ---- Orders list ---- */}
      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
            data-testid={`seller-order-card-${order.id}`}
          >
            {/* Order header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDate(order.createdAt)} · Customer: {order.customer.name}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Status badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(order.status)}`}
                  data-testid={`order-status-${order.id}`}
                >
                  {order.status}
                </span>

                {/* Action buttons */}
                {order.status === 'CONFIRMED' && (
                  <Button
                    size="sm"
                    onClick={() => openConfirmModal(order, 'SHIPPED')}
                    data-testid={`ship-order-${order.id}`}
                  >
                    Mark as Shipped
                  </Button>
                )}
                {order.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => openConfirmModal(order, 'CONFIRMED')}
                    data-testid={`confirm-order-${order.id}`}
                  >
                    Confirm Order
                  </Button>
                )}
              </div>
            </div>

            {/* Tracking number input (only for the order being shipped) */}
            {trackingOrderId === order.id && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Enter tracking number
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., 1Z999AA10123456784"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                    data-testid={`tracking-input-${order.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={handleShipWithTracking}
                    loading={updateStatus.isPending}
                    disabled={!trackingNumber.trim()}
                    data-testid={`tracking-submit-${order.id}`}
                  >
                    Ship
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTrackingOrderId(null)}
                    disabled={updateStatus.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tracking number (already shipped) */}
            {order.status === 'SHIPPED' && order.trackingNumber && (
              <div className="mb-4 text-sm text-blue-600 dark:text-blue-400">
                Tracking: {order.trackingNumber}
              </div>
            )}

            {/* Order items */}
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                  data-testid={`seller-order-item-${item.id}`}
                >
                  {/* Product image */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-700">
                    {item.product.images.length > 0 ? (
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

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {item.product.name}
                    </p>
                    {item.variation && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {[item.variation.size, item.variation.color].filter(Boolean).join(' / ') ||
                          item.variation.sku}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        ${Number(item.priceAtTime).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ---- Confirm / Ship Confirmation Modal ---- */}
      <ConfirmModal
        isOpen={confirmTarget !== null}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        title={confirmTarget?.action === 'CONFIRMED' ? 'Confirm Order' : 'Mark as Shipped'}
        message={
          confirmTarget?.action === 'CONFIRMED'
            ? 'Are you sure you want to confirm this order?'
            : 'Are you sure you want to mark this order as shipped?'
        }
        confirmLabel={confirmTarget?.action === 'CONFIRMED' ? 'Confirm' : 'Ship'}
        cancelLabel="Cancel"
        isLoading={updateStatus.isPending}
      />
    </div>
  );
}

export default OrdersPage;
