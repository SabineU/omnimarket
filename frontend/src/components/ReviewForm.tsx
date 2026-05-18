// frontend/src/components/ReviewForm.tsx
// A modal form that lets the user submit a product review (1‑5 stars + comment).
// Now accepts an optional title prop to differentiate between first review and
// additional details.
import { useState } from 'react';
import Modal from './ui/Modal';
import { Button } from './ui';

// ---------------------------------------------------------------------------
// Inline StarRating component – five clickable stars
// ---------------------------------------------------------------------------
interface StarRatingProps {
  rating: number; // currently selected rating (0 = none)
  onChange: (rating: number) => void;
  disabled?: boolean;
}

function StarRating({ rating, onChange, disabled = false }: StarRatingProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            star <= rating ? 'text-yellow-400' : 'text-neutral-300 dark:text-neutral-600'
          } disabled:cursor-not-allowed`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          data-testid={`star-${star}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewForm props
// ---------------------------------------------------------------------------
interface ReviewFormProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user cancels or closes the modal */
  onCancel: () => void;
  /** Called when the user submits the review */
  onSubmit: (rating: number, comment: string) => void;
  /** Whether the submission is in progress */
  isLoading: boolean;
  /** The name of the product being reviewed */
  productName: string;
  /** Optional title override. Defaults to "Review {productName}" */
  title?: string; // <-- added
}

function ReviewForm({
  isOpen,
  onCancel,
  onSubmit,
  isLoading,
  productName,
  title, // <-- added
}: ReviewFormProps): React.JSX.Element {
  // Local state for the form fields
  const [rating, setRating] = useState<number>(0); // 0 means no rating yet
  const [comment, setComment] = useState<string>('');

  // Error states for inline validation
  const [ratingError, setRatingError] = useState<string | null>(null);

  const handleSubmit = (): void => {
    // Validate that a rating was selected
    if (rating === 0) {
      setRatingError('Please select a star rating.');
      return;
    }
    setRatingError(null);
    onSubmit(rating, comment.trim());
    // Reset the form after submission
    setRating(0);
    setComment('');
  };

  const handleCancel = (): void => {
    // Reset form state
    setRating(0);
    setComment('');
    setRatingError(null);
    onCancel();
  };

  const heading = title ?? `Review ${productName}`; // <-- use prop or default

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} ariaLabel={heading}>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{heading}</h2>

      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        How would you rate this product?
      </p>

      {/* Star rating */}
      <div className="mt-4" data-testid="review-star-rating">
        <StarRating rating={rating} onChange={setRating} disabled={isLoading} />
        {ratingError && (
          <p className="mt-1 text-xs text-error-500" role="alert">
            {ratingError}
          </p>
        )}
        {rating > 0 && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {rating} out of 5 stars
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="mt-4">
        <label
          htmlFor="review-comment"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          rows={3}
          placeholder="Share your experience with this product..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
          data-testid="review-comment-input"
        />
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
          data-testid="review-modal-cancel"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          loading={isLoading}
          data-testid="review-modal-submit"
        >
          Submit Review
        </Button>
      </div>
    </Modal>
  );
}

export default ReviewForm;
