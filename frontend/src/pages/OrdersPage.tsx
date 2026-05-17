// frontend/src/pages/OrdersPage.tsx
// Customer order history page – shows a list of past orders.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Spinner } from '../components/ui';

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

interface OrdersResponse {
  status: string;
  data: {
    orders: Order[];
  };
}

function OrdersPage(): React.JSX.Element {
  const { data, isLoading, error } = useQuery<OrdersResponse, Error>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<OrdersResponse>('/orders');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-error-500">Failed to load orders. Please try again.</p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const orders = data?.data?.orders ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="orders-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Your Orders
      </h1>

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
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800"
              data-testid={`order-card-${order.id}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                  {order.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  ${parseFloat(order.totalAmount).toFixed(2)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {new Date(order.createdAt).toLocaleDateString()}
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
