// frontend/src/pages/OrderDetailPage.tsx
// Displays the details of a single order after checkout (or from order history).
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types – must match the backend's actual response shape
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  customerId?: string;
  status: string;
  shippingAddressId?: string;
  totalAmount: string;
  createdAt: string;
  updatedAt?: string;
}

interface OrderResponse {
  status: string;
  data: {
    order: Order;
  };
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
        {/* Debug: show raw response for troubleshooting */}
        <details className="mt-6 text-left text-xs text-neutral-400 max-w-lg mx-auto">
          <summary className="cursor-pointer hover:text-neutral-500">Debug: API response</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // ---- Success ----
  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="order-detail-page">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Order Confirmed!
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
      </div>

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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={`/orders/${order.id}`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full" data-testid="view-order-details-button">
            View Full Order
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
