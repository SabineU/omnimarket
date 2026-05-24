// seller-frontend/src/__tests__/components/ImageUploadRow.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadRow from '../../components/ImageUploadRow';
import { useImageUpload } from '../../hooks/useImageUpload';

vi.mock('../../hooks/useImageUpload');

describe('ImageUploadRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    rowKey: 'k1',
    url: '',
    altText: '',
    onUrlChange: vi.fn(),
    onAltTextChange: vi.fn(),
    onRemove: vi.fn(),
  };

  it('shows upload and paste buttons when no URL is set', () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    render(<ImageUploadRow {...baseProps} />);
    expect(screen.getByTestId('image-upload-btn-k1')).toBeInTheDocument();
    expect(screen.getByText('Paste URL')).toBeInTheDocument();
    expect(screen.getByTestId('image-remove-k1')).toBeInTheDocument();
  });

  it('shows uploading spinner while mutation is pending', () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    });
    render(<ImageUploadRow {...baseProps} />);
    expect(screen.getByText('Uploading image…')).toBeInTheDocument();
  });

  it('displays thumbnail and alt input when URL is set', () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    render(
      <ImageUploadRow {...baseProps} url="https://example.com/img.jpg" altText="Front view" />,
    );
    expect(screen.getByAltText('Front view')).toBeInTheDocument();
    expect(screen.getByTestId('image-alt-k1')).toHaveValue('Front view');
  });

  it('calls onRemove when remove button is clicked', async () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    const onRemove = vi.fn();
    render(<ImageUploadRow {...baseProps} onRemove={onRemove} />);
    await userEvent.click(screen.getByTestId('image-remove-k1'));
    expect(onRemove).toHaveBeenCalledWith('k1');
  });

  it('shows manual URL input and submits it', async () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    const onUrlChange = vi.fn();
    render(<ImageUploadRow {...baseProps} onUrlChange={onUrlChange} />);

    await userEvent.click(screen.getByText('Paste URL'));
    const urlInput = screen.getByTestId('image-url-k1');
    expect(urlInput).toBeInTheDocument();

    await userEvent.type(urlInput, 'https://example.com/manual.jpg');
    await userEvent.click(screen.getByText('Add'));

    expect(onUrlChange).toHaveBeenCalledWith('k1', 'https://example.com/manual.jpg');
  });

  it('does not submit manual URL when input is empty', async () => {
    (useImageUpload as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    const onUrlChange = vi.fn();
    render(<ImageUploadRow {...baseProps} onUrlChange={onUrlChange} />);

    await userEvent.click(screen.getByText('Paste URL'));

    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
    expect(onUrlChange).not.toHaveBeenCalled();
  });
});
