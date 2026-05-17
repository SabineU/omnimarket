// frontend/src/pages/OrdersPage.tsx
// Customer order history page – shows a list of all past orders with
// status badges, order totals, and dates.  Each row links to the
// order detail page.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types – must match the backend's GET /api/orders response
// ---------------------------------------------------------------------------

/** A single order in the history list (summary view) */
interface OrderSummary {
  id: string;
  status: string; // e.g. "CONFIRMED", "SHIPPED", "CANCELLED"
  totalAmount: string; // stored as a string to preserve precision
  createdAt: string;
}

/** Pagination metadata returned by the backend */
interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface OrdersResponse {
  status: string;
  data: {
    orders: OrderSummary[];
    pagination: Pagination;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map an order status to a Tailwind colour scheme for the badge.
 * Each status gets a distinct background + text colour so the user
 * can see at a glance what state their order is in.
 */
function statusBadgeClasses(status: string): string {
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

/**
 * Convert UPPER_SNAKE_CASE status strings to Title Case for display.
 * e.g. "RETURN_REQUESTED" → "Return Requested"
 */
function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format an ISO date string to a human‑readable local date.
 */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function OrdersPage(): React.JSX.Element {
  // Fetch the authenticated user's orders from the backend.
  // React Query caches the result and re‑fetches when the component mounts
  // or the window regains focus.
  const { data, isLoading, error } = useQuery<OrdersResponse, Error>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<OrdersResponse>('/orders');
      return data;
    },
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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
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
          Failed to load orders
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  // Safely extract orders and pagination
  const orders = data?.data?.orders ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="orders-page">
      {/* ---- Page heading ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Your Orders</h1>
        {pagination && pagination.totalItems > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagination.totalItems} order{pagination.totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ---- Empty state ---- */}
      {orders.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            No orders yet
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Looks like you haven&apos;t placed any orders yet.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            data-testid="start-shopping-button"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        /* ---- Order list ---- */
        <div className="space-y-4" data-testid="orders-list">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800"
              data-testid={`order-card-${order.id}`}
            >
              {/* Top row: order number + status badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(order.status)}`}
                  data-testid={`order-status-${order.id}`}
                >
                  {formatStatus(order.status)}
                </span>
              </div>

              {/* Bottom row: total + date */}
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  ${parseFloat(order.totalAmount).toFixed(2)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {formatDate(order.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
