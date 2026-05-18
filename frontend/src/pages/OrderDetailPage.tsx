// frontend/src/pages/OrderDetailPage.tsx
// Displays the details of a single order after checkout (or from order history).
// Now includes a visual status tracker, order items list, and:
// - Cancel Order button with confirmation modal
// - Return Request button with reason form modal
// - Review submission button for each product in delivered orders
// - "Reviewed" badge + "Add more reviews" link for products already reviewed
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useCancelOrder } from '../hooks/useCancelOrder';
import { useReturnOrder } from '../hooks/useReturnOrder';
import { useSubmitReview } from '../hooks/useSubmitReview';
import ConfirmModal from '../components/ConfirmModal';
import ReturnRequestModal from '../components/ReturnRequestModal';
import ReviewForm from '../components/ReviewForm';
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
    id: string;
    name: string;
    images: { url: string }[];
  };
  variation: {
    sku: string;
    size: string | null;
    color: string | null;
  } | null;
  hasReviewed?: boolean;
}

/** Full order object returned by GET /orders/:id */
interface Order {
  id: string;
  customerId?: string;
  status: string;
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

const STATUS_STEPS = [
  { label: 'Confirmed', status: 'CONFIRMED' },
  { label: 'Shipped', status: 'SHIPPED' },
  { label: 'Delivered', status: 'DELIVERED' },
] as const;

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

function isPositiveStatus(status: string): boolean {
  return !['CANCELLED', 'RETURNED', 'RETURN_REQUESTED'].includes(status);
}

function isCancellable(status: string): boolean {
  return ['PENDING', 'CONFIRMED'].includes(status);
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

  // Mutations
  const cancelOrder = useCancelOrder();
  const returnOrder = useReturnOrder();
  const submitReview = useSubmitReview();

  // Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Review modal target
  const [reviewTarget, setReviewTarget] = useState<{
    productId: string;
    productName: string;
    isAdditional?: boolean;
  } | null>(null);

  // Track which product IDs have been reviewed (persisted + local)
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());

  // When the order data loads, initialise reviewedProductIds from persisted data.
  useEffect(() => {
    if (data?.data.order.items) {
      const initialReviewed = new Set<string>();
      for (const item of data.data.order.items) {
        if (item.hasReviewed) {
          initialReviewed.add(item.product.id);
        }
      }
      // This is a legitimate use of setState inside an effect:
      // we synchronise local state with the fetched server data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReviewedProductIds(initialReviewed);
    }
  }, [data]);

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

  // ---- Cancel order handlers ----
  const openCancelModal = (): void => setShowCancelModal(true);
  const handleCancelConfirm = (): void => {
    if (orderId) cancelOrder.mutate(orderId, { onSuccess: () => setShowCancelModal(false) });
  };
  const handleCancelDismiss = (): void => setShowCancelModal(false);

  // ---- Return order handlers ----
  const openReturnModal = (): void => setShowReturnModal(true);
  const handleReturnSubmit = (data: { reason: string }): void => {
    if (orderId)
      returnOrder.mutate(
        { orderId, reason: data.reason },
        { onSuccess: () => setShowReturnModal(false) },
      );
  };
  const handleReturnDismiss = (): void => setShowReturnModal(false);

  // ---- Review handlers ----
  const openReviewModal = (productId: string, productName: string, isAdditional = false): void => {
    setReviewTarget({ productId, productName, isAdditional });
  };

  const handleReviewSubmit = (rating: number, comment: string): void => {
    if (!reviewTarget) return;
    submitReview.mutate(
      {
        productId: reviewTarget.productId,
        rating,
        comment,
        isAdditional: reviewTarget.isAdditional ?? false,
      },
      {
        onSuccess: () => {
          // Mark this product as reviewed in local state
          setReviewedProductIds((prev) => new Set(prev).add(reviewTarget.productId));
          setReviewTarget(null);
        },
      },
    );
  };

  const handleReviewDismiss = (): void => setReviewTarget(null);

  const currentStepIndex = getCurrentStepIndex(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="order-detail-page">
      {/* ---- Confirmation header ---- */}
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
                const isComplete = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <li key={step.status} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isComplete ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'} ${isCurrent ? 'ring-4 ring-primary-200 dark:ring-primary-800' : ''}`}
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
                        className={`mt-2 text-xs font-medium ${isComplete ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${index < currentStepIndex ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
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
                      ${parseFloat(item.priceAtTime).toFixed(2)}
                    </span>
                  </div>

                  {/* ---- Review section (only for delivered orders) ---- */}
                  {order.status === 'DELIVERED' && (
                    <div className="mt-2 flex items-center gap-3">
                      {reviewedProductIds.has(item.product.id) ? (
                        <>
                          {/* Reviewed badge */}
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <svg
                              className="h-3.5 w-3.5"
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
                            Reviewed
                          </span>
                          {/* Add more reviews link */}
                          <button
                            type="button"
                            onClick={() =>
                              openReviewModal(item.product.id, item.product.name, true)
                            }
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            data-testid={`additional-review-button-${item.id}`}
                          >
                            Add more reviews
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReviewModal(item.product.id, item.product.name)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          data-testid={`review-button-${item.id}`}
                        >
                          Write a Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Cancel Order button ---- */}
      {isCancellable(order.status) && (
        <div
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
          data-testid="cancel-order-section"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Need to cancel this order?
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                You can cancel before the seller ships your order.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={openCancelModal}
              className="w-full sm:w-auto border-error-300 text-error-600 hover:bg-error-50 dark:border-error-700 dark:text-error-400 dark:hover:bg-error-950"
              data-testid="cancel-order-button"
            >
              Cancel Order
            </Button>
          </div>
        </div>
      )}

      {/* ---- Return Request button ---- */}
      {order.status === 'DELIVERED' && (
        <div
          className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
          data-testid="return-order-section"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Not satisfied with your order?
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                You can request a return or refund within 30 days of delivery.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={openReturnModal}
              className="w-full sm:w-auto border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900"
              data-testid="return-order-button"
            >
              Request Return
            </Button>
          </div>
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

      {/* ---- Cancel Confirmation Modal ---- */}
      <ConfirmModal
        isOpen={showCancelModal}
        onCancel={handleCancelDismiss}
        onConfirm={handleCancelConfirm}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        isLoading={cancelOrder.isPending}
      />

      {/* ---- Return Request Modal ---- */}
      <ReturnRequestModal
        isOpen={showReturnModal}
        onCancel={handleReturnDismiss}
        onSubmit={handleReturnSubmit}
        isLoading={returnOrder.isPending}
      />

      {/* ---- Review Form Modal ---- */}
      {reviewTarget && (
        <ReviewForm
          isOpen={reviewTarget !== null}
          onCancel={handleReviewDismiss}
          onSubmit={handleReviewSubmit}
          isLoading={submitReview.isPending}
          productName={reviewTarget.productName}
          title={
            reviewTarget.isAdditional
              ? `Add more reviews for ${reviewTarget.productName}`
              : undefined
          }
        />
      )}
    </div>
  );
}

export default OrderDetailPage;
