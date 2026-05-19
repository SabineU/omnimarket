// frontend/src/__tests__/components/ReviewForm.test.tsx
// Unit tests for the ReviewForm component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewForm from '../../components/ReviewForm';

vi.mock('../../components/ui/Modal', () => ({
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }): React.JSX.Element | null => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

describe('ReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders star rating buttons and submit', () => {
    render(
      <ReviewForm
        isOpen
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        productName="Test Product"
      />,
    );

    expect(screen.getByTestId('review-star-rating')).toBeInTheDocument();
    expect(screen.getByTestId('review-modal-submit')).toBeInTheDocument();
    // The title should contain the product name
    expect(screen.getByText('Review Test Product')).toBeInTheDocument();
  });

  it('uses custom title when provided', () => {
    render(
      <ReviewForm
        isOpen
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        productName="Test Product"
        title="Add more reviews for Test Product"
      />,
    );

    expect(screen.getByText('Add more reviews for Test Product')).toBeInTheDocument();
  });

  it('shows validation error when no rating is selected', async () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        isOpen
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        productName="Test Product"
      />,
    );

    // Click submit without selecting a rating
    await userEvent.click(screen.getByTestId('review-modal-submit'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with rating and comment', async () => {
    const onSubmit = vi.fn();
    render(
      <ReviewForm
        isOpen
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        productName="Test Product"
      />,
    );

    // Select 4-star rating
    await userEvent.click(screen.getByTestId('star-4'));

    // Type a comment
    await userEvent.type(screen.getByTestId('review-comment-input'), 'Pretty good');

    // Submit
    await userEvent.click(screen.getByTestId('review-modal-submit'));

    expect(onSubmit).toHaveBeenCalledWith(4, 'Pretty good');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ReviewForm
        isOpen
        onCancel={onCancel}
        onSubmit={vi.fn()}
        isLoading={false}
        productName="Test Product"
      />,
    );

    await userEvent.click(screen.getByTestId('review-modal-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
