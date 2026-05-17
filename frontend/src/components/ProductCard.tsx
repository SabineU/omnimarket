// frontend/src/components/ProductCard.tsx
// A clickable card for a single product in listing grids.
import { Link } from 'react-router-dom';

/** Minimal product shape passed from ProductListPage */
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  sellerName: string;
}

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps): React.JSX.Element {
  return (
    <Link
      to={`/products/${product.id}`}
      className="block rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden"
      data-testid={`product-card-${product.id}`}
    >
      {/* Product image */}
      <div className="aspect-square bg-neutral-100 dark:bg-neutral-700">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {product.name}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{product.sellerName}</p>
        <p className="mt-2 text-lg font-bold text-primary-600">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  );
}

export default ProductCard;
