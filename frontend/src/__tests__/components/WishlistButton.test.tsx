// frontend/src/__tests__/components/WishlistButton.test.tsx
// Unit tests for the WishlistButton component.
import { describe, it, expect, beforeEach } from 'vitest'; // removed unused 'vi'
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistProvider } from '../../contexts/WishlistProvider';
import WishlistButton from '../../components/WishlistButton';

// A minimal wrapper because the component needs the wishlist context
function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  // added return type
  return render(<WishlistProvider>{ui}</WishlistProvider>);
}

beforeEach(() => {
  localStorage.clear();
});

describe('WishlistButton', () => {
  const product = {
    id: 'prod-1',
    name: 'Test',
    slug: 'test',
    basePrice: 10,
    imageUrl: 'http://example.com/img.jpg',
  };

  it('should render compact heart icon by default', () => {
    renderWithProvider(<WishlistButton product={product} />);
    const button = screen.getByTestId('wishlist-button-prod-1');
    expect(button).toBeInTheDocument();
    const svg = button.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe('none');
  });

  it('should toggle to filled heart when clicked', async () => {
    renderWithProvider(<WishlistButton product={product} />);
    const button = screen.getByTestId('wishlist-button-prod-1');
    await userEvent.click(button);
    const svg = button.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
  });

  it('should render full version when compact is false', () => {
    renderWithProvider(<WishlistButton product={product} compact={false} />);
    const button = screen.getByTestId('wishlist-button-prod-1');
    expect(button).toHaveTextContent('Save');
  });

  it('should show "Saved" after clicking in full mode', async () => {
    renderWithProvider(<WishlistButton product={product} compact={false} />);
    const button = screen.getByTestId('wishlist-button-prod-1');
    await userEvent.click(button);
    expect(button).toHaveTextContent('Saved');
  });
});
