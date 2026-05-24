// seller-frontend/src/pages/LedgerPage.tsx
// Seller ledger page – shows earnings summary and transaction history.
import { useSellerLedger } from '../hooks/useSellerLedger';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as USD currency */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format an ISO date string to a readable local date */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Map order status to a Tailwind badge colour */
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

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string;
  dataTestid?: string;
}

function StatCard({ label, value, dataTestid }: StatCardProps): React.JSX.Element {
  return (
    <div
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
      data-testid={dataTestid}
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LedgerPage Component
// ---------------------------------------------------------------------------
function LedgerPage(): React.JSX.Element {
  const { data, isLoading, error } = useSellerLedger();

  // ---- CSV download handler ----
  const handleDownloadCsv = (): void => {
    // We open the CSV export URL directly – the backend sets Content-Disposition
    window.open('/api/seller/ledger/export/csv', '_blank');
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
      <div className="text-center py-16" data-testid="seller-ledger-error">
        <p className="text-error-500 dark:text-error-400">Failed to load ledger: {error.message}</p>
      </div>
    );
  }

  if (!data) return <div />;

  return (
    <div data-testid="seller-ledger-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Ledger</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadCsv}
          data-testid="ledger-export-csv"
        >
          Export CSV
        </Button>
      </div>

      {/* ---- Summary cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Earned"
          value={formatCurrency(data.totalEarned)}
          dataTestid="stat-total-earned"
        />
        <StatCard
          label={`Commission (${data.commissionRate}%)`}
          value={`−${formatCurrency(data.totalCommission)}`}
          dataTestid="stat-commission"
        />
        <StatCard
          label="Net Earnings"
          value={formatCurrency(data.netEarnings)}
          dataTestid="stat-net-earnings"
        />
        <StatCard
          label="Pending Payout"
          value={formatCurrency(data.pendingPayout)}
          dataTestid="stat-pending-payout"
        />
      </div>

      {/* ---- Transaction table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Transactions ({data.transactions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="ledger-transactions-table">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Order
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Product
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                  Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                  Unit Price
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
              {data.transactions.map((tx) => (
                <tr
                  key={`${tx.orderId}-${tx.productName}`}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  data-testid={`ledger-row-${tx.orderId}`}
                >
                  <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-mono text-xs">
                    {tx.orderId.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                    {tx.productName}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">
                    {tx.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(tx.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(tx.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(tx.orderStatus)}`}
                    >
                      {tx.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">
                    {formatDate(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LedgerPage;
