import { type FormEvent, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { CatalogSkeleton, InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import { ProductCard } from '@/app/components/product-card';
import { useGetCategoriesQuery, useGetProductsQuery } from '@/features/catalog/catalog-api';
import type {
  ProductQuery,
  ProductSort,
  StorefrontCategory,
} from '@/features/catalog/catalog.types';

const allowedSorts = new Set<ProductSort>(['relevance', 'newest', 'price-asc', 'price-desc']);

function positivePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function flattenCategories(
  categories: StorefrontCategory[],
  depth = 0,
): Array<StorefrontCategory & { depth: number }> {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children, depth + 1),
  ]);
}

export function Component() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const category = searchParams.get('category') ?? '';
  const rawSort = searchParams.get('sort');
  const sort: ProductSort = allowedSorts.has(rawSort as ProductSort)
    ? (rawSort as ProductSort)
    : search
      ? 'relevance'
      : 'newest';
  const page = positivePage(searchParams.get('page'));
  const [searchInput, setSearchInput] = useState(search);

  const query: ProductQuery = { page, limit: 12, sort };
  if (search) query.search = search;
  if (category) query.category = category;

  const products = useGetProductsQuery(query);
  const categories = useGetCategoriesQuery();
  const categoryOptions = flattenCategories(categories.data?.categories ?? []);
  const heading =
    location.pathname === '/search'
      ? 'Search the collection'
      : location.pathname === '/collections'
        ? 'Shop by collection'
        : 'The collection';
  const currentPage = products.data?.page ?? page;
  const totalPages = products.data?.totalPages ?? 0;

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setSearchParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilter('search', searchInput.trim());
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="catalog-page">
      <PageMeta
        title={heading}
        description="Browse the previous store catalog and access existing products."
        noIndex={location.pathname === '/search' || Boolean(search)}
      />
      <header className="page-intro">
        <p className="eyebrow">Previous store / Catalog</p>
        <h1>{heading}</h1>
        <p>Pieces with presence, designed for repeat wear and a life in motion.</p>
      </header>

      <div className="catalog-toolbar">
        <form className="catalog-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="catalog-search">
            Search products
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchInput}
            maxLength={80}
            placeholder="Search the collection"
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <label>
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => updateFilter('category', event.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((item) => (
              <option key={item.id} value={item.slug}>
                {'— '.repeat(item.depth)}
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => updateFilter('sort', event.target.value)}>
            {search ? <option value="relevance">Relevance</option> : null}
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="catalog-summary" aria-live="polite">
        <p>{products.data ? `${products.data.total} pieces` : 'Loading pieces'}</p>
        {search || category ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearchParams({});
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {products.isLoading ? <CatalogSkeleton count={8} /> : null}
      {products.isError ? (
        <InlineError
          message="We could not load the collection. Please try again."
          onRetry={() => void products.refetch()}
        />
      ) : null}
      {products.data?.items.length ? (
        <div className="product-grid">
          {products.data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
      {products.data && !products.data.items.length ? (
        <div className="catalog-empty">
          <p className="eyebrow">No matches</p>
          <h2>Nothing fits those filters yet.</h2>
          <button
            className="button button--dark"
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearchParams({});
            }}
          >
            View all pieces
          </button>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Catalog pages">
          <button
            type="button"
            disabled={currentPage <= 1 || products.isFetching}
            onClick={() => changePage(currentPage - 1)}
          >
            Previous
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || products.isFetching}
            onClick={() => changePage(currentPage + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
