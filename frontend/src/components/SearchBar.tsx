// frontend/src/components/SearchBar.tsx
// Autocomplete search bar with debounce, API suggestions, and keyboard navigation.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a product returned by the quick‑search API */
interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: { url: string; altText: string }[];
}

/** Shape of the API response for a product search */
interface SearchResponse {
  status: string;
  data: {
    products: SearchProduct[];
  };
}

function SearchBar(): React.JSX.Element {
  // The raw value typed by the user
  const [query, setQuery] = useState('');
  // The debounced value used for the API call
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Debounce the input by 300ms ----
  useEffect(() => {
    const timer = setTimeout((): void => {
      setDebouncedQuery(query);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [query]);

  // ---- Close dropdown when clicking outside ----
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---- Fetch suggestions using React Query ----
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: async (): Promise<SearchResponse> => {
      const params = new URLSearchParams();
      params.set('search', debouncedQuery);
      params.set('limit', '5');
      params.set('sort', 'newest');
      const { data } = await apiClient.get<SearchResponse>(`/products?${params.toString()}`);
      return data;
    },
    enabled: debouncedQuery.length > 0,
  });

  // ---- Handlers ----
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
    if (e.target.value.trim()) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        setIsDropdownOpen(false);
      }
    }
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSuggestionClick = useCallback(
    (slug: string): void => {
      navigate(`/products/${slug}`);
      setIsDropdownOpen(false);
      setQuery('');
    },
    [navigate],
  );

  // Determine whether to show the dropdown
  const showDropdown =
    isDropdownOpen &&
    debouncedQuery.length > 0 &&
    (isLoading || (data && data.data.products.length > 0));

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4 hidden md:block">
      <div className="relative">
        {/* Magnifying glass icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search for anything…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(): void => {
            if (query.trim()) setIsDropdownOpen(true);
          }}
          data-testid="global-search-input"
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors"
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
      </div>

      {/* ---- Autocomplete dropdown ---- */}
      {showDropdown && (
        <div
          className="absolute top-full mt-2 w-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 py-2"
          data-testid="search-dropdown"
          role="listbox"
        >
          {/* Loading state */}
          {isLoading && <div className="px-4 py-2 text-sm text-neutral-400">Searching…</div>}

          {/* Suggestions */}
          {data &&
            data.data.products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                onClick={(): void => {
                  handleSuggestionClick(product.slug);
                }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
                data-testid={`search-suggestion-${product.slug}`}
                role="option"
              >
                {/* Small thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0">
                  {product.images[0] && (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].altText}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    ${product.basePrice}
                  </p>
                </div>
              </Link>
            ))}

          {/* No results */}
          {data && data.data.products.length === 0 && (
            <div className="px-4 py-2 text-sm text-neutral-400">No products found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
