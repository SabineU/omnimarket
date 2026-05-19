// frontend/src/__tests__/components/ReturnRequestModal.test.tsx
// Unit tests for the ReturnRequestModal component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReturnRequestModal from '../../components/ReturnRequestModal';

// The Modal component uses createPortal which attaches to document.body.
// We mock it to simplify testing. We'll test the form logic directly.
vi.mock('../../components/ui/Modal', () => ({
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }): React.JSX.Element | null => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

describe('ReturnRequestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form when open', () => {
    render(<ReturnRequestModal isOpen onCancel={vi.fn()} onSubmit={vi.fn()} isLoading={false} />);

    expect(screen.getByTestId('return-reason-input')).toBeInTheDocument();
    expect(screen.getByTestId('return-modal-submit')).toBeInTheDocument();
    expect(screen.getByTestId('return-modal-cancel')).toBeInTheDocument();
  });

  it('shows validation error when reason is too short', async () => {
    const onSubmit = vi.fn();
    render(<ReturnRequestModal isOpen onCancel={vi.fn()} onSubmit={onSubmit} isLoading={false} />);

    // Type a short reason
    await userEvent.type(screen.getByTestId('return-reason-input'), 'Bad');

    // Submit the form
    await userEvent.click(screen.getByTestId('return-modal-submit'));

    // The validation error should appear
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the reason when valid', async () => {
    const onSubmit = vi.fn();
    render(<ReturnRequestModal isOpen onCancel={vi.fn()} onSubmit={onSubmit} isLoading={false} />);

    // Type a valid reason (at least 10 characters)
    await userEvent.type(
      screen.getByTestId('return-reason-input'),
      'The item arrived damaged and is unusable.',
    );

    // Submit the form
    await userEvent.click(screen.getByTestId('return-modal-submit'));

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'The item arrived damaged and is unusable.' });
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<ReturnRequestModal isOpen onCancel={onCancel} onSubmit={vi.fn()} isLoading={false} />);

    await userEvent.click(screen.getByTestId('return-modal-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <ReturnRequestModal isOpen={false} onCancel={vi.fn()} onSubmit={vi.fn()} isLoading={false} />,
    );

    expect(screen.queryByTestId('return-reason-input')).not.toBeInTheDocument();
  });
});
