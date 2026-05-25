// admin-frontend/src/pages/UsersPage.tsx
// Admin user management page – search, filter by role, pagination,
// toggle active status, and delete with confirmation modal.
import { useState } from 'react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useToggleUserActive } from '../hooks/useToggleUserActive';
import { useDeleteUser } from '../hooks/useDeleteUser';
import { Button, Spinner } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Colour badge for user role */
function roleBadge(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'SELLER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'CUSTOMER':
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function UsersPage(): React.JSX.Element {
  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // User list query
  const { data, isLoading, error } = useAdminUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    page,
    limit: 10,
  });

  // Mutations
  const toggleActive = useToggleUserActive();
  const deleteUser = useDeleteUser();

  // Delete confirmation
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // ---- Handlers ----
  const users = data?.data.users ?? [];
  const pagination = data?.data.pagination;

  const handleToggleActive = (userId: string, current: boolean): void => {
    toggleActive.mutate({ userId, isActive: !current });
  };

  const handleDeleteConfirm = (): void => {
    if (deletingUserId) {
      deleteUser.mutate(deletingUserId, {
        onSuccess: () => setDeletingUserId(null),
        onError: () => setDeletingUserId(null),
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setPage(1); // reset to first page on new search
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
      <div className="text-center py-16" data-testid="admin-users-error">
        <p className="text-error-500 dark:text-error-400">Failed to load users: {error.message}</p>
      </div>
    );
  }

  return (
    <div data-testid="admin-users-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        Users {pagination ? `(${pagination.totalItems})` : ''}
      </h1>

      {/* ---- Filters ---- */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="user-search-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="user-role-filter"
        >
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SELLER">Seller</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" size="sm" data-testid="user-search-button">
          Search
        </Button>
      </form>

      {/* ---- Table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="users-table">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                  Role
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600 dark:text-neutral-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  data-testid={`user-row-${user.id}`}
                >
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        data-testid={`toggle-user-${user.id}`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeletingUserId(user.id)}
                        className="text-sm font-medium text-error-500 hover:text-error-600 dark:text-error-400"
                        data-testid={`delete-user-${user.id}`}
                      >
                        Delete
                      </button>
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

      {/* ---- Delete confirmation modal ---- */}
      <ConfirmModal
        isOpen={deletingUserId !== null}
        onCancel={() => setDeletingUserId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep user"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}

export default UsersPage;
