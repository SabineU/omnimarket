// seller-frontend/src/components/ProductFormModal.tsx
// A modal form for creating or editing a product.
// Handles name, description, category, price, brand, variations, and images.
// Now uses ImageUploadRow for file upload + paste URL support.
import { useState, useEffect, type FormEvent } from 'react';
import { useCategories } from '../hooks/useCategories';
import {
  useCreateProduct,
  useUpdateProduct,
  type CreateProductPayload,
} from '../hooks/useProductMutations';
import { type SellerProduct } from '../hooks/useSellerProducts';
import ImageUploadRow from './ImageUploadRow'; // <-- added
import { Button, Spinner } from './ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VariationInput {
  key: string; // temporary client‑side key for React list rendering
  sku: string;
  size: string;
  color: string;
  priceModifier: number;
  stockQty: number;
}

interface ImageInput {
  key: string;
  url: string;
  altText: string;
}

interface ProductFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user closes the modal */
  onClose: () => void;
  /** If provided, the form is in "edit" mode and pre‑fills with this product */
  existingProduct?: SellerProduct | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextKey = 1;
function genKey(): string {
  return `k${nextKey++}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ProductFormModal({
  isOpen,
  onClose,
  existingProduct,
}: ProductFormModalProps): React.JSX.Element | null {
  const isEdit = !!existingProduct;

  // Fetch categories for the dropdown
  const { data: categoriesData, isLoading: catLoading } = useCategories();
  const categories = categoriesData?.data.categories ?? [];

  // Mutations
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // ---- Form state ----
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [brand, setBrand] = useState('');
  const [variations, setVariations] = useState<VariationInput[]>([]);
  const [images, setImages] = useState<ImageInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ---- Pre‑fill form when editing ----
  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setDescription(existingProduct.description);
      setCategoryId(existingProduct.categoryId);
      setBasePrice(String(existingProduct.basePrice));
      setBrand(existingProduct.brand ?? '');
      setVariations(
        existingProduct.variations.map((v: SellerProduct['variations'][number]) => ({
          key: genKey(),
          sku: v.sku,
          size: v.size ?? '',
          color: v.color ?? '',
          priceModifier: v.priceModifier,
          stockQty: v.stockQty,
        })),
      );
      setImages(
        existingProduct.images.map((img: SellerProduct['images'][number]) => ({
          key: genKey(),
          url: img.url,
          altText: img.altText,
        })),
      );
    } else {
      // Reset for create mode
      setName('');
      setDescription('');
      setCategoryId('');
      setBasePrice('');
      setBrand('');
      setVariations([]);
      setImages([]);
    }
  }, [existingProduct, isOpen]);

  // ---- Variation helpers ----
  const addVariation = (): void => {
    setVariations((prev) => [
      ...prev,
      { key: genKey(), sku: '', size: '', color: '', priceModifier: 0, stockQty: 0 },
    ]);
  };

  const updateVariation = (
    key: string,
    field: keyof VariationInput,
    value: string | number,
  ): void => {
    setVariations((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };

  const removeVariation = (key: string): void => {
    setVariations((prev) => prev.filter((v) => v.key !== key));
  };

  // ---- Image helpers ----
  const addImage = (): void => {
    setImages((prev) => [...prev, { key: genKey(), url: '', altText: '' }]);
  };

  /** Called by ImageUploadRow when a URL is set (upload or manual) */
  const handleImageUrlChange = (key: string, url: string): void => {
    setImages((prev) => prev.map((img) => (img.key === key ? { ...img, url } : img)));
  };

  /** Called by ImageUploadRow when the alt text changes */
  const handleImageAltChange = (key: string, altText: string): void => {
    setImages((prev) => prev.map((img) => (img.key === key ? { ...img, altText } : img)));
  };

  const removeImage = (key: string): void => {
    setImages((prev) => prev.filter((img) => img.key !== key));
  };

  // ---- Submit ----
  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);

    // Build the payload
    const payload: CreateProductPayload = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      basePrice: parseFloat(basePrice),
      brand: brand.trim() || undefined,
      variations: variations.map((v) => ({
        sku: v.sku.trim(),
        size: v.size.trim() || undefined,
        color: v.color.trim() || undefined,
        priceModifier: Number(v.priceModifier),
        stockQty: Number(v.stockQty),
      })),
      images: images
        .filter((img) => img.url.trim()) // only send rows that have a URL
        .map((img) => ({
          url: img.url.trim(),
          altText: img.altText.trim() || img.url, // fallback alt text
        })),
    };

    if (isEdit && existingProduct) {
      updateProduct.mutate(
        { productId: existingProduct.id, ...payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createProduct.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  if (!isOpen) return null;

  return (
    // Full‑screen overlay modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        data-testid="product-form-backdrop"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h2>

        {catLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="product-form">
            {/* Error banner */}
            {error && <p className="text-error-500 dark:text-error-400 text-sm">{error}</p>}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                required
                minLength={3}
                data-testid="product-form-name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                required
                minLength={10}
                data-testid="product-form-description"
              />
            </div>

            {/* Category + Price row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  required
                  data-testid="product-form-category"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                  required
                  data-testid="product-form-price"
                />
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                data-testid="product-form-brand"
              />
            </div>

            {/* ---- Variations ---- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Variations
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariation}
                  data-testid="product-form-add-variation"
                >
                  + Add Variation
                </Button>
              </div>

              {variations.length === 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  No variations yet. Add sizes, colours, etc.
                </p>
              )}

              <div className="space-y-3">
                {variations.map((v) => (
                  <div
                    key={v.key}
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                    data-testid={`variation-row-${v.key}`}
                  >
                    <input
                      type="text"
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) => updateVariation(v.key, 'sku', e.target.value)}
                      className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                      data-testid={`variation-sku-${v.key}`}
                    />
                    <input
                      type="text"
                      placeholder="Size"
                      value={v.size}
                      onChange={(e) => updateVariation(v.key, 'size', e.target.value)}
                      className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                    />
                    <input
                      type="text"
                      placeholder="Colour"
                      value={v.color}
                      onChange={(e) => updateVariation(v.key, 'color', e.target.value)}
                      className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                    />
                    <input
                      type="number"
                      placeholder="Price mod"
                      value={v.priceModifier}
                      onChange={(e) =>
                        updateVariation(v.key, 'priceModifier', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.stockQty}
                      onChange={(e) =>
                        updateVariation(v.key, 'stockQty', parseInt(e.target.value) || 0)
                      }
                      className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariation(v.key)}
                      className="text-error-500 hover:text-error-600 text-sm"
                      data-testid={`variation-remove-${v.key}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Images ---- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Images
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImage}
                  data-testid="product-form-add-image"
                >
                  + Add Image
                </Button>
              </div>

              {images.length === 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  No images yet. Upload or paste URLs.
                </p>
              )}

              <div className="space-y-2">
                {images.map((img) => (
                  <ImageUploadRow
                    key={img.key}
                    rowKey={img.key}
                    url={img.url}
                    altText={img.altText}
                    onUrlChange={handleImageUrlChange}
                    onAltTextChange={handleImageAltChange}
                    onRemove={removeImage}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                data-testid="product-form-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" loading={isLoading} data-testid="product-form-submit">
                {isEdit ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProductFormModal;
