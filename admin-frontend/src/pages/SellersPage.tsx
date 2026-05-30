// admin-frontend/src/pages/SellersPage.tsx
// Admin seller verification interface.
// Displays all sellers in a table with search, approval-status filter,
// pagination, and Approve/Reject action buttons.
//
// Features:
// - Search by name, email, or store name
// - Filter by approval status: All, Pending (not approved), Approved
// - Paginated table with Previous/Next navigation
// - Approve button (green) for pending sellers
// - Reject button (red outline) for approved sellers
// - Status badges: "Approved" (green), "Pending" (yellow)
// - Loading spinner and error state
// - Empty state when no sellers match the filters

import { useState } from 'react';
import { useAdminSellers, type AdminSeller } from '../hooks/useAdminSellers';
import { useApproveSeller } from '../hooks/useApproveSeller';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map an approval status boolean to a Tailwind CSS badge.
 * - Approved (true)  → green badge
 * - Pending (false)  → yellow/amber badge
 */
function approvalBadge(isApproved: boolean): string {
  return isApproved
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
}

/**
 * Format an ISO date string to a human‑readable local date.
 * Example: "2026-05-01T00:00:00.000Z" → "May 1, 2026"
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

function SellersPage(): React.JSX.Element {
  // ---- Filter & Pagination State ----
  const [search, setSearch] = useState('');
  // approvalFilter: undefined = show all, true = approved only, false = pending only
  const [approvalFilter, setApprovalFilter] = useState<string>(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(1);

  // Convert the string filter to a boolean or undefined for the API
  const isApprovedFilter: boolean | undefined =
    approvalFilter === '' ? undefined : approvalFilter === 'true';

  // ---- Data Fetching ----
  const { data, isLoading, error } = useAdminSellers({
    search: search || undefined,
    isApproved: isApprovedFilter,
    page,
    limit: 10,
  });

  // ---- Mutation ----
  const approveSeller = useApproveSeller();

  // ---- Confirmation Modal State ----
  // Stores the seller that the admin wants to approve/reject
  const [confirmTarget, setConfirmTarget] = useState<{
    seller: AdminSeller;
    action: 'approve' | 'reject';
  } | null>(null);

  // ---- Derived Data ----
  const sellers = data?.data.sellers ?? [];
  const pagination = data?.data.pagination;

  // ---- Handlers ----

  /**
   * Open the confirmation modal before approving or rejecting.
   * This prevents accidental clicks from immediately changing a seller's status.
   */
  const openConfirmModal = (seller: AdminSeller, action: 'approve' | 'reject'): void => {
    setConfirmTarget({ seller, action });
  };

  /** Execute the actual approve/reject mutation after the admin confirms */
  const handleConfirmAction = (): void => {
    if (!confirmTarget) return;

    approveSeller.mutate(
      {
        userId: confirmTarget.seller.userId,
        isApproved: confirmTarget.action === 'approve',
      },
      {
        // Close the modal on success (the hook handles toast & query invalidation)
        onSuccess: () => setConfirmTarget(null),
        // Also close on error – the error toast will inform the admin
        onError: () => setConfirmTarget(null),
      },
    );
  };

  /** Reset to page 1 when search or filter changes */
  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setPage(1);
  };

  const handleFilterChange = (value: string): void => {
    setApprovalFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---- Error State ----
  if (error) {
    return (
      <div className="text-center py-16" data-testid="admin-sellers-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load sellers: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="admin-sellers-page">
      {/* ---- Page Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Seller Verification
          {pagination && pagination.totalItems > 0 && (
            <span className="ml-2 text-lg font-normal text-neutral-500 dark:text-neutral-400">
              ({pagination.totalItems} seller{pagination.totalItems !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
      </div>

      {/* ---- Filters Bar ---- */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex gap-3 mb-6 flex-wrap"
        data-testid="sellers-filter-bar"
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="Search by name, email, or store…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100 min-w-[250px]"
          data-testid="seller-search-input"
        />

        {/* Approval status filter dropdown */}
        <select
          value={approvalFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="seller-status-filter"
        >
          <option value="">All Sellers</option>
          <option value="false">Pending Approval</option>
          <option value="true">Approved</option>
        </select>

        <Button type="submit" size="sm" data-testid="seller-search-button">
          Search
        </Button>
      </form>

      {/* ---- Sellers Table ---- */}
      {sellers.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">
            No sellers found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="sellers-table">
              {/* ---- Table Header ---- */}
              <thead className="bg-neutral-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                    Seller
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                    Store
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                    Commission
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    Registered
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* ---- Table Body ---- */}
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {sellers.map((seller) => (
                  <tr
                    key={seller.userId}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    data-testid={`seller-row-${seller.userId}`}
                  >
                    {/* Seller name + email */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {seller.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {seller.email}
                      </p>
                    </td>

                    {/* Store name + description preview */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {seller.storeName}
                      </p>
                      {seller.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                          {seller.description}
                        </p>
                      )}
                    </td>

                    {/* Approval status badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${approvalBadge(seller.isApproved)}`}
                        data-testid={`seller-status-${seller.userId}`}
                      >
                        {seller.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    {/* Commission rate */}
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-300">
                      {seller.commissionRate}%
                    </td>

                    {/* Registration date */}
                    <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {formatDate(seller.createdAt)}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {seller.isApproved ? (
                          /* Already approved → show Reject button */
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfirmModal(seller, 'reject')}
                            className="border-error-300 text-error-600 hover:bg-error-50 dark:border-error-700 dark:text-error-400 dark:hover:bg-error-950"
                            data-testid={`reject-seller-${seller.userId}`}
                          >
                            Revoke
                          </Button>
                        ) : (
                          /* Pending → show Approve button */
                          <Button
                            size="sm"
                            onClick={() => openConfirmModal(seller, 'approve')}
                            data-testid={`approve-seller-${seller.userId}`}
                          >
                            Approve
                          </Button>
                        )}
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
      )}

      {/* ---- Confirmation Modal ---- */}
      <ConfirmModal
        isOpen={confirmTarget !== null}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
        title={confirmTarget?.action === 'approve' ? 'Approve Seller' : 'Revoke Seller Approval'}
        message={
          confirmTarget?.action === 'approve'
            ? `Are you sure you want to approve "${confirmTarget?.seller.storeName}"? Their products will become visible to customers.`
            : `Are you sure you want to revoke approval for "${confirmTarget?.seller.storeName}"? Their products will be hidden from the marketplace.`
        }
        confirmLabel={confirmTarget?.action === 'approve' ? 'Approve' : 'Revoke'}
        cancelLabel="Cancel"
        isLoading={approveSeller.isPending}
      />
    </div>
  );
}

export default SellersPage;
