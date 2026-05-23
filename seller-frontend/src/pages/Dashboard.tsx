// seller-frontend/src/pages/Dashboard.tsx
// Seller dashboard – displays summary stat cards and a visual bar chart.
// Uses the default Recharts tooltip, which we style via global CSS.
import { useSellerDashboard } from '../hooks/useSellerDashboard';
import { Spinner } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as USD currency */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Transform the dashboard summary into an array of { name, value }
 * objects that Recharts can consume directly.
 */
function buildChartData(summary: {
  todaySales: number;
  pendingOrders: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
}): { name: string; value: number }[] {
  // <-- explicit return type
  return [
    { name: "Today's Sales", value: summary.todaySales },
    { name: 'Pending Orders', value: summary.pendingOrders },
    { name: 'Total Products', value: summary.totalProducts },
    { name: 'Total Reviews', value: summary.totalReviews },
    { name: 'Avg Rating', value: summary.averageRating },
  ];
}

// ---------------------------------------------------------------------------
// StatCard – a single KPI tile
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  dataTestid?: string;
}

function StatCard({ label, value, subtext, dataTestid }: StatCardProps): React.JSX.Element {
  return (
    <div
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
      data-testid={dataTestid}
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
      {subtext && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{subtext}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------
function Dashboard(): React.JSX.Element {
  const { data, isLoading, error } = useSellerDashboard();

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
      <div className="text-center py-16" data-testid="seller-dashboard-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load dashboard: {error.message}
        </p>
      </div>
    );
  }

  // ---- Success ----
  if (!data) return <div />;

  const chartData = buildChartData(data);

  return (
    <div data-testid="seller-dashboard">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">Dashboard</h1>

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(data.todaySales)}
          dataTestid="stat-today-sales"
        />
        <StatCard
          label="Pending Orders"
          value={String(data.pendingOrders)}
          dataTestid="stat-pending-orders"
        />
        <StatCard
          label="Total Products"
          value={String(data.totalProducts)}
          dataTestid="stat-total-products"
        />
        <StatCard
          label="Total Reviews"
          value={String(data.totalReviews)}
          dataTestid="stat-total-reviews"
        />
        <StatCard
          label="Average Rating"
          value={data.averageRating.toFixed(1)}
          subtext="out of 5"
          dataTestid="stat-average-rating"
        />
      </div>

      {/* ---- Chart ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Performance Overview
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              {/* Default tooltip – styled globally in index.css */}
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500 text-center">
          Key metrics visualised. Add time‑series charts as you build out analytics.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
