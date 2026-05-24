// seller-frontend/src/__tests__/components/ProductFormModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductFormModal from '../../components/ProductFormModal';
import { useCategories } from '../../hooks/useCategories';
import { useCreateProduct, useUpdateProduct } from '../../hooks/useProductMutations';

vi.mock('../../hooks/useCategories');
vi.mock('../../hooks/useProductMutations');
// Fix: add explicit return type to the mock factory
vi.mock(
  '../../hooks/useImageUpload',
  (): { useImageUpload: () => { mutate: ReturnType<typeof vi.fn>; isPending: boolean } } => ({
    useImageUpload: () => ({ mutate: vi.fn(), isPending: false }),
  }),
);

describe('ProductFormModal', () => {
  const createMutate = vi.fn();
  const updateMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: { categories: [{ id: 'c1', name: 'Electronics', slug: 'electronics' }] } },
      isLoading: false,
    });
    (useCreateProduct as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    });
    (useUpdateProduct as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    });
  });

  it('renders the create form with empty fields', () => {
    render(<ProductFormModal isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('product-form-name')).toHaveValue('');
    expect(screen.getByTestId('product-form-description')).toHaveValue('');
    expect(screen.getByTestId('product-form-price')).toHaveValue(null);
    expect(screen.getByTestId('product-form-submit')).toHaveTextContent('Create Product');
  });

  it('renders in edit mode with pre‑filled fields', () => {
    const existing = {
      id: 'p1',
      name: 'Existing Product',
      description: 'Existing description',
      basePrice: 49.99,
      brand: null,
      categoryId: 'c1',
      slug: 'existing',
      status: 'ACTIVE',
      images: [],
      variations: [],
      createdAt: '',
    };
    render(<ProductFormModal isOpen onClose={vi.fn()} existingProduct={existing} />);
    expect(screen.getByTestId('product-form-name')).toHaveValue('Existing Product');
    expect(screen.getByTestId('product-form-description')).toHaveValue('Existing description');
    expect(screen.getByTestId('product-form-price')).toHaveValue(49.99);
    expect(screen.getByTestId('product-form-submit')).toHaveTextContent('Save Changes');
  });

  it('adds a variation row', async () => {
    render(<ProductFormModal isOpen onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('product-form-add-variation'));
    expect(screen.getAllByTestId(/^variation-sku-/).length).toBe(1);
  });

  it('adds an image row', async () => {
    render(<ProductFormModal isOpen onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('product-form-add-image'));
    expect(screen.getAllByTestId(/^image-upload-btn-/).length).toBe(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<ProductFormModal isOpen onClose={onClose} />);
    await userEvent.click(screen.getByTestId('product-form-cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls createProduct when form is submitted with valid data', async () => {
    render(<ProductFormModal isOpen onClose={vi.fn()} />);
    await userEvent.type(screen.getByTestId('product-form-name'), 'New Product');
    await userEvent.type(
      screen.getByTestId('product-form-description'),
      'A great product for testing.',
    );
    await userEvent.selectOptions(screen.getByTestId('product-form-category'), 'c1');
    await userEvent.type(screen.getByTestId('product-form-price'), '29.99');
    await userEvent.click(screen.getByTestId('product-form-submit'));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Product',
        description: 'A great product for testing.',
        categoryId: 'c1',
        basePrice: 29.99,
      }),
      expect.any(Object),
    );
  });

  it('calls updateProduct when form is submitted in edit mode', async () => {
    const existing = {
      id: 'p1',
      name: 'Old Name',
      description: 'Old description',
      basePrice: 19.99,
      brand: null,
      categoryId: 'c1',
      slug: 'old-slug',
      status: 'ACTIVE',
      images: [],
      variations: [],
      createdAt: '',
    };
    render(<ProductFormModal isOpen onClose={vi.fn()} existingProduct={existing} />);
    await userEvent.clear(screen.getByTestId('product-form-name'));
    await userEvent.type(screen.getByTestId('product-form-name'), 'New Name');
    await userEvent.click(screen.getByTestId('product-form-submit'));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', name: 'New Name' }),
      expect.any(Object),
    );
  });
});
