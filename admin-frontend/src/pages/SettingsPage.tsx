// admin-frontend/src/pages/SettingsPage.tsx
// Admin system settings – structured form with common configuration fields.
// Reads existing values from the API and allows bulk saving.
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { useUpdateSetting } from '../hooks/useUpdateSetting';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Settings shape – these keys are stored in the database
// ---------------------------------------------------------------------------
interface AppSettings {
  // General
  siteName: string;
  contactEmail: string;
  // Commission & Fees
  commissionRate: number; // percentage
  taxRate: number; // percentage
  // Shipping
  freeShippingThreshold: number; // order total above which shipping is free
  // Orders
  orderExpiryHours: number; // auto‑cancel pending orders after X hours (0 = disabled)
  // Email
  emailFromAddress: string;
  enableOrderEmails: boolean; // toggle for email notifications
}

// Default values used when no setting exists in the database
const DEFAULTS: AppSettings = {
  siteName: 'OmniMarket',
  contactEmail: 'support@omnimarket.com',
  commissionRate: 10,
  taxRate: 0,
  freeShippingThreshold: 0,
  orderExpiryHours: 48,
  emailFromAddress: 'noreply@omnimarket.com',
  enableOrderEmails: true,
};

// Human‑readable labels for each field
const LABELS: Record<keyof AppSettings, string> = {
  siteName: 'Site Name',
  contactEmail: 'Contact Email',
  commissionRate: 'Commission Rate (%)',
  taxRate: 'Default Tax Rate (%)',
  freeShippingThreshold: 'Free Shipping Threshold ($)',
  orderExpiryHours: 'Order Expiry (hours)',
  emailFromAddress: 'Email From Address',
  enableOrderEmails: 'Enable Order Emails',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function SettingsPage(): React.JSX.Element {
  // Fetch existing settings
  const { data, isLoading, error } = useAdminSettings();
  const updateSetting = useUpdateSetting();

  // Local state for the form
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  // Track which keys have been changed (to avoid unnecessary updates)
  const [dirty, setDirty] = useState(false);

  // Populate form with values from the API on load
  useEffect(() => {
    if (!data) return;

    const apiSettings = data.data.settings ?? [];

    // Build a map of key → value from API response
    const apiMap = new Map(apiSettings.map((s) => [s.key, s.value]));

    setSettings((prev) => {
      const updated = { ...prev };

      for (const key of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
        const stored = apiMap.get(key);
        if (stored !== undefined) {
          // Convert boolean and number fields from stored string
          if (typeof prev[key] === 'boolean') {
            (updated[key] as boolean) = stored === 'true';
          } else if (typeof prev[key] === 'number') {
            (updated[key] as number) = Number(stored);
          } else {
            (updated[key] as string) = stored;
          }
        }
      }

      return updated;
    });
  }, [data]);

  // Generic change handler
  const handleChange = (key: keyof AppSettings, value: string | number | boolean): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Save all settings in parallel
  const handleSaveAll = async (): Promise<void> => {
    // Build an array of promises for each key that differs from defaults or has been changed
    const promises: Promise<unknown>[] = [];

    for (const key of Object.keys(settings) as (keyof AppSettings)[]) {
      const value = settings[key];
      const stringValue = typeof value === 'boolean' ? String(value) : String(value);
      promises.push(updateSetting.mutateAsync({ key, value: stringValue }));
    }

    try {
      await Promise.all(promises);
      toast.success('All settings saved');
      setDirty(false);
    } catch {
      toast.error('Some settings failed to save');
    }
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
      <div className="text-center py-16" data-testid="admin-settings-error">
        <p className="text-error-500 dark:text-error-400">
          Failed to load settings: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="admin-settings-page" className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          System Settings
        </h1>
        <Button
          onClick={handleSaveAll}
          loading={updateSetting.isPending}
          disabled={!dirty}
          data-testid="save-all-settings"
        >
          Save All Settings
        </Button>
      </div>

      {/* ---- General Section ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {LABELS.siteName}
            </label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
              data-testid="setting-siteName"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {LABELS.contactEmail}
            </label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
              data-testid="setting-contactEmail"
            />
          </div>
        </div>
      </section>

      {/* ---- Commission & Tax ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">Commission & Tax</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {LABELS.commissionRate}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={settings.commissionRate}
              onChange={(e) => handleChange('commissionRate', Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
              data-testid="setting-commissionRate"
            />
            <p className="mt-1 text-xs text-neutral-400">Percentage taken from seller earnings</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {LABELS.taxRate}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={settings.taxRate}
              onChange={(e) => handleChange('taxRate', Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
              data-testid="setting-taxRate"
            />
            <p className="mt-1 text-xs text-neutral-400">Default tax applied to orders</p>
          </div>
        </div>
      </section>

      {/* ---- Shipping ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">Shipping</h2>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {LABELS.freeShippingThreshold}
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={settings.freeShippingThreshold}
            onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            data-testid="setting-freeShippingThreshold"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Order total above which shipping is free (0 = disabled)
          </p>
        </div>
      </section>

      {/* ---- Orders ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">Orders</h2>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {LABELS.orderExpiryHours}
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.orderExpiryHours}
            onChange={(e) => handleChange('orderExpiryHours', Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            data-testid="setting-orderExpiryHours"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Auto‑cancel pending orders after X hours (0 = never)
          </p>
        </div>
      </section>

      {/* ---- Email ---- */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <h2 className="text-lg font-semibold mb-4">Email Notifications</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {LABELS.emailFromAddress}
            </label>
            <input
              type="email"
              value={settings.emailFromAddress}
              onChange={(e) => handleChange('emailFromAddress', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
              data-testid="setting-emailFromAddress"
            />
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableOrderEmails}
                onChange={(e) => handleChange('enableOrderEmails', e.target.checked)}
                className="sr-only peer"
                data-testid="setting-enableOrderEmails"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
              <span className="ms-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {LABELS.enableOrderEmails}
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* ---- Advanced (raw key‑value table kept as fallback) ---- */}
      <details className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 mb-6">
        <summary className="text-lg font-semibold cursor-pointer text-neutral-700 dark:text-neutral-300">
          Advanced
        </summary>
        <p className="text-xs text-neutral-400 mb-3 mt-2">
          Edit raw key‑value pairs. Use with caution.
        </p>
        <table className="w-full text-sm" data-testid="settings-table">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                Key
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">
                Value
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {(data?.data.settings ?? []).map((setting) => (
              <tr
                key={setting.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                data-testid={`setting-row-${setting.key}`}
              >
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {setting.key}
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-700 dark:text-neutral-300">{setting.value}</span>
                </td>
                <td className="px-4 py-3 text-right">{/* Inline editing can be added later */}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default SettingsPage;
