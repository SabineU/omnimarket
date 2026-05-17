// frontend/src/pages/OrderDetailPage.tsx
// Displays the details of a single order after checkout (or from order history).
// Now includes a visual status tracker and order items list.
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types – must match the backend's actual response shape
// ---------------------------------------------------------------------------

/** A single line item in the order */
interface OrderItem {
  id: string;
  quantity: number;
  priceAtTime: string;
  product: {
    name: string;
    images: { url: string }[];
  };
  variation: {
    sku: string;
    size: string | null;
    color: string | null;
  } | null;
}

/** Full order object returned by GET /orders/:id */
interface Order {
  id: string;
  customerId?: string;
  status: string; // e.g. "CONFIRMED", "SHIPPED", "DELIVERED"
  shippingAddressId?: string;
  totalAmount: string;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
}

interface OrderResponse {
  status: string;
  data: {
    order: Order;
  };
}

// ---------------------------------------------------------------------------
// Status tracker configuration
// ---------------------------------------------------------------------------

/**
 * Each step in the order lifecycle has a label and a corresponding
 * backend status value.  We define them in order so we can render
 * a timeline that highlights everything up to and including the
 * current status.
 */
const STATUS_STEPS = [
  { label: 'Confirmed', status: 'CONFIRMED' },
  { label: 'Shipped', status: 'SHIPPED' },
  { label: 'Delivered', status: 'DELIVERED' },
] as const;

/**
 * Return the index of the current status in the STATUS_STEPS array.
 * If the status is not found (e.g. CANCELLED, RETURNED), return -1
 * so that no steps are highlighted.
 */
function getCurrentStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((step) => step.status === status);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Determine if the order has a "positive" status (i.e. it's still
 * progressing normally, not cancelled or returned).
 */
function isPositiveStatus(status: string): boolean {
  return !['CANCELLED', 'RETURNED', 'RETURN_REQUESTED'].includes(status);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function OrderDetailPage(): React.JSX.Element {
  const { orderId } = useParams<{ orderId: string }>();

  const { data, isLoading, error } = useQuery<OrderResponse, Error>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId,
  });

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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-100 dark:bg-error-900">
          <svg
            className="h-8 w-8 text-error-600 dark:text-error-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Failed to load order
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error.message}</p>
        <Link to="/orders">
          <Button variant="outline" className="mt-6">
            View all orders
          </Button>
        </Link>
      </div>
    );
  }

  // ---- Not found state ----
  const order = data?.data?.order;
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Order not found
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          The order you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link to="/orders">
          <Button className="mt-6">View all orders</Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="order-detail-page">
      {/* ---- Confirmation header (only for positive statuses) ---- */}
      {isPositiveStatus(order.status) && (
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Order {formatStatus(order.status)}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {order.status === 'CONFIRMED' &&
              'Thank you for your purchase! Your order has been placed successfully.'}
            {order.status === 'SHIPPED' && 'Your order is on its way!'}
            {order.status === 'DELIVERED' && 'Your order has been delivered. Enjoy!'}
            {order.status === 'PENDING' && 'Your order is being processed.'}
          </p>
        </div>
      )}

      {/* ---- Status tracker ---- */}
      {currentStepIndex >= 0 && (
        <div className="mb-8" data-testid="order-status-tracker">
          <nav aria-label="Order progress">
            <ol className="flex items-center">
              {STATUS_STEPS.map((step, index) => {
                // A step is "complete" if its index is <= the current step
                const isComplete = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <li key={step.status} className="flex-1 flex items-center">
                    {/* Step circle */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isComplete
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                        } ${isCurrent ? 'ring-4 ring-primary-200 dark:ring-primary-800' : ''}`}
                        data-testid={`tracker-step-${step.status}`}
                      >
                        {isComplete ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isComplete
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>

                    {/* Connector line between steps */}
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                          index < currentStepIndex
                            ? 'bg-primary-600'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      )}

      {/* ---- Cancelled / Returned status notice ---- */}
      {!isPositiveStatus(order.status) && (
        <div className="mb-8 rounded-xl border border-error-200 bg-error-50 p-4 text-center dark:border-error-800 dark:bg-error-950">
          <h1 className="text-xl font-bold text-error-700 dark:text-error-400">
            Order {formatStatus(order.status)}
          </h1>
          <p className="mt-1 text-sm text-error-600 dark:text-error-500">
            {order.status === 'CANCELLED' && 'This order has been cancelled.'}
            {order.status === 'RETURN_REQUESTED' && 'A return has been requested for this order.'}
            {order.status === 'RETURNED' && 'This order has been returned.'}
          </p>
        </div>
      )}

      {/* ---- Order details card ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Order Details
        </h2>

        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Order Number</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">
              #{order.id.slice(0, 8).toUpperCase()}
            </dd>
          </div>

          <div className="flex justify-between text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Status</dt>
            <dd>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                {formatStatus(order.status)}
              </span>
            </dd>
          </div>

          <div className="flex justify-between text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Total</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
              ${parseFloat(order.totalAmount).toFixed(2)}
            </dd>
          </div>

          <div className="flex justify-between text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Placed on</dt>
            <dd className="text-neutral-900 dark:text-neutral-100">
              {formatDate(order.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ---- Order items ---- */}
      {order.items && order.items.length > 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Items ({order.items.length})
          </h2>

          <ul
            className="divide-y divide-neutral-100 dark:divide-neutral-700"
            data-testid="order-items-list"
          >
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 py-3 first:pt-0 last:pb-0"
                data-testid={`order-item-${item.id}`}
              >
                {/* Product image */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-700">
                  {item.product.images.length > 0 ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      <svg
                        className="h-6 w-6"
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

                  {/* Variation details */}
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
                      ${parseFloat(item.priceAtTime).toFixed(2)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/orders" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full" data-testid="view-all-orders-button">
            View All Orders
          </Button>
        </Link>
        <Link to="/products" className="w-full sm:w-auto">
          <Button className="w-full" data-testid="continue-shopping-button">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default OrderDetailPage;
