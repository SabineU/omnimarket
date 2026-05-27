// admin-frontend/src/pages/SettingsPage.tsx
// Admin system settings – list key‑value pairs and edit them inline.
import { useState } from 'react';
import { useAdminSettings, type AdminSetting } from '../hooks/useAdminSettings';
import { useUpdateSetting } from '../hooks/useUpdateSetting';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// InlineEditRow – shows a setting; clicking Edit reveals an input & Save button
// ---------------------------------------------------------------------------
interface InlineEditRowProps {
  setting: AdminSetting;
  isSaving: boolean;
  onSave: (key: string, newValue: string) => void;
}

function InlineEditRow({ setting, isSaving, onSave }: InlineEditRowProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.value);

  const handleSave = (): void => {
    if (value.trim() === setting.value) {
      setEditing(false);
      return;
    }
    onSave(setting.key, value.trim());
    setEditing(false);
  };

  const handleCancel = (): void => {
    setValue(setting.value);
    setEditing(false);
  };

  return (
    <tr
      className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
      data-testid={`setting-row-${setting.key}`}
    >
      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
        {setting.key}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            disabled={isSaving}
            data-testid={`setting-input-${setting.key}`}
          />
        ) : (
          <span className="text-neutral-700 dark:text-neutral-300">{setting.value}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              data-testid={`setting-save-${setting.key}`}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            data-testid={`setting-edit-${setting.key}`}
          >
            Edit
          </Button>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// SettingsPage Component
// ---------------------------------------------------------------------------
function SettingsPage(): React.JSX.Element {
  const { data, isLoading, error } = useAdminSettings();
  const updateSetting = useUpdateSetting();

  const settings = data?.data.settings ?? [];

  const handleSave = (key: string, newValue: string): void => {
    updateSetting.mutate({ key, value: newValue });
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
    <div data-testid="admin-settings-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        System Settings
      </h1>

      {/* ---- Table ---- */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
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
            {settings.map((setting) => (
              <InlineEditRow
                key={setting.id}
                setting={setting}
                isSaving={updateSetting.isPending}
                onSave={handleSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SettingsPage;
