// admin-frontend/src/pages/Dashboard.tsx
// Admin dashboard – displays key platform metrics and recent orders.
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { Spinner } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as USD currency */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format ISO date to readable string */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Build chart data from summary */
function buildChartData(summary: {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalSellers: number;
  totalProducts: number;
}): { name: string; value: number }[] {
  return [
    { name: 'Revenue', value: summary.totalRevenue },
    { name: 'Orders', value: summary.totalOrders },
    { name: 'Customers', value: summary.totalCustomers },
    { name: 'Sellers', value: summary.totalSellers },
    { name: 'Products', value: summary.totalProducts },
  ];
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
// Dashboard Component
// ---------------------------------------------------------------------------
function Dashboard(): React.JSX.Element {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16" data-testid="admin-dashboard-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load dashboard: {error.message}
        </p>
      </div>
    );
  }

  if (!data) return <div />;

  const chartData = buildChartData(data);

  return (
    <div data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">Dashboard</h1>

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          dataTestid="stat-total-revenue"
        />
        <StatCard
          label="Total Orders"
          value={String(data.totalOrders)}
          dataTestid="stat-total-orders"
        />
        <StatCard
          label="Total Customers"
          value={String(data.totalCustomers)}
          dataTestid="stat-total-customers"
        />
        <StatCard
          label="Total Sellers"
          value={String(data.totalSellers)}
          dataTestid="stat-total-sellers"
        />
        <StatCard
          label="Total Products"
          value={String(data.totalProducts)}
          dataTestid="stat-total-products"
        />
      </div>

      {/* ---- Chart ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Platform Overview
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Recent Orders ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Recent Orders
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="recent-orders-table">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Order
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                  Customer
                </th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                  Amount
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
              {data.recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  data-testid={`recent-order-${order.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">{order.customerName}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : order.status === 'CONFIRMED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    {formatDate(order.createdAt)}
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

export default Dashboard;
