// seller-frontend/src/components/ImageUploadRow.tsx
// A single row for adding a product image – supports file upload or manual URL.
import { useState, useRef } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploadRowProps {
  /** Unique key for React list rendering */
  rowKey: string;
  /** Current URL (empty if not yet provided) */
  url: string;
  /** Current alt text */
  altText: string;
  /** Called when the URL is set (after upload or paste) */
  onUrlChange: (key: string, url: string) => void;
  /** Called when the alt text changes */
  onAltTextChange: (key: string, altText: string) => void;
  /** Called to remove this row */
  onRemove: (key: string) => void;
  /** Disable interactions while the form is submitting */
  disabled?: boolean;
}

function ImageUploadRow({
  rowKey,
  url,
  altText,
  onUrlChange,
  onAltTextChange,
  onRemove,
  disabled = false,
}: ImageUploadRowProps): React.JSX.Element {
  // Local state for manual URL entry
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useImageUpload();

  // Handle file selection – immediately start uploading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess: (uploadedUrl) => {
        onUrlChange(rowKey, uploadedUrl);
      },
    });
    // Reset the file input so the same file can be re‑selected
    e.target.value = '';
  };

  // Submit manually entered URL
  const handleManualSubmit = (): void => {
    const trimmed = manualUrl.trim();
    if (trimmed) {
      onUrlChange(rowKey, trimmed);
      setManualUrl('');
      setShowManualInput(false);
    }
  };

  // ---- Uploading state ----
  if (uploadMutation.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
        <div className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">
          Uploading image…
        </div>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  // ---- URL already set (uploaded or pasted) ----
  if (url) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        data-testid={`image-row-${rowKey}`}
      >
        {/* Thumbnail preview */}
        <img
          src={url}
          alt={altText || 'Product image'}
          className="h-14 w-14 rounded object-cover shrink-0 bg-neutral-100 dark:bg-neutral-700"
        />

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate" title={url}>
            {url}
          </p>
          <input
            type="text"
            placeholder="Alt text (e.g. front view)"
            value={altText}
            onChange={(e) => onAltTextChange(rowKey, e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-0.5 text-xs dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            disabled={disabled}
            data-testid={`image-alt-${rowKey}`}
          />
        </div>

        <button
          type="button"
          onClick={() => onRemove(rowKey)}
          className="text-error-500 hover:text-error-600 text-sm shrink-0 mt-1"
          disabled={disabled}
          data-testid={`image-remove-${rowKey}`}
        >
          ✕
        </button>
      </div>
    );
  }

  // ---- No URL yet – show upload / paste controls ----
  return (
    <div
      className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
      data-testid={`image-row-${rowKey}`}
    >
      <div className="flex items-center gap-2">
        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          disabled={disabled}
          data-testid={`image-upload-btn-${rowKey}`}
        >
          📁 Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          data-testid={`image-file-input-${rowKey}`}
        />

        {/* Toggle manual paste */}
        <button
          type="button"
          onClick={() => setShowManualInput((prev) => !prev)}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          disabled={disabled}
        >
          {showManualInput ? 'Hide URL' : 'Paste URL'}
        </button>

        {/* Remove row */}
        <button
          type="button"
          onClick={() => onRemove(rowKey)}
          className="ml-auto text-error-500 hover:text-error-600 text-sm"
          disabled={disabled}
          data-testid={`image-remove-${rowKey}`}
        >
          ✕
        </button>
      </div>

      {/* Manual URL input (collapsible) */}
      {showManualInput && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            disabled={disabled}
            data-testid={`image-url-${rowKey}`}
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            className="rounded bg-primary-600 px-3 py-1 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
            disabled={disabled || !manualUrl.trim()}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUploadRow;
