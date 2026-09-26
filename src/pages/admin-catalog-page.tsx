import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import {
  useGetAdminCategoriesQuery,
  useGetAdminProductsQuery,
  useUpdateAdminProductMutation,
} from '@/features/admin/admin-operations-api';
import type { AdminProduct, ProductStatus } from '@/features/admin/admin.types';
import { apiErrorMessage, formatPrice } from '@/shared/commerce';

const productStatuses: Array<{ value: ProductStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function Component() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'categories' ? 'categories' : 'products';
  const search = params.get('search') ?? '';
  const rawStatus = params.get('status');
  const status = productStatuses.some(({ value }) => value === rawStatus)
    ? (rawStatus as ProductStatus)
    : undefined;
  const [searchInput, setSearchInput] = useState(search);
  const products = useGetAdminProductsQuery(
    view === 'products' ? { page: 1, limit: 50, search: search || undefined, status } : undefined,
    { skip: view !== 'products' },
  );
  const categories = useGetAdminCategoriesQuery(
    view === 'categories' ? { page: 1, limit: 100, status } : undefined,
    { skip: view !== 'categories' },
  );
  const [updateProduct, updateState] = useUpdateAdminProductMutation();
  const [actionId, setActionId] = useState<string>();
  const [actionError, setActionError] = useState('');

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParam('search', searchInput.trim());
  }

  async function patchProduct(
    product: AdminProduct,
    change: { status?: ProductStatus; isFeatured?: boolean },
  ) {
    setActionId(product.id);
    setActionError('');
    try {
      await updateProduct({
        productId: product.id,
        expectedVersion: product.version,
        ...change,
      }).unwrap();
    } catch (error) {
      setActionError(apiErrorMessage(error, 'Product could not be updated. Refresh and retry.'));
    } finally {
      setActionId(undefined);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Catalog operations</p>
          <h1>Products & structure</h1>
          <p>Control storefront visibility from server-owned product and category records.</p>
        </div>
        <div className="admin-page-actions">
          <Link to="/admin/catalog/products/new">New product</Link>
          <Link to="/admin/catalog/categories/new">New category</Link>
          <Link to="/admin/catalog/media">Media library</Link>
        </div>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Catalog views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'products'}
          onClick={() => setParams({})}
        >
          Products
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'categories'}
          onClick={() => setParams({ view: 'categories' })}
        >
          Categories
        </button>
      </div>

      <div className="admin-toolbar">
        {view === 'products' ? (
          <form role="search" onSubmit={submitSearch}>
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder="Search product or SKU"
              aria-label="Search products"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        ) : (
          <span />
        )}
        <label>
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            {productStatuses.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError ? (
        <p className="admin-alert" role="alert">
          {actionError}
        </p>
      ) : null}

      {view === 'products' ? (
        <>
          {products.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
          {products.isError ? (
            <InlineError
              message="Products could not be loaded."
              onRetry={() => void products.refetch()}
            />
          ) : null}
          {products.data ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption className="sr-only">Admin products</caption>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Variants</th>
                    <th>From</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.items.map((product) => {
                    const prices = product.variants.map(({ priceInPaise }) => priceInPaise);
                    const available = product.inventory?.reduce(
                      (total, item) => total + item.available,
                      0,
                    );
                    const busy = updateState.isLoading && actionId === product.id;
                    return (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                          <span>{product.slug}</span>
                        </td>
                        <td>
                          <span className="admin-badge" data-status={product.status}>
                            {product.status}
                          </span>
                          {product.isFeatured ? <small>Featured</small> : null}
                        </td>
                        <td>{product.variants.length}</td>
                        <td>{prices.length ? formatPrice(Math.min(...prices)) : '—'}</td>
                        <td>{available ?? 'Open detail'}</td>
                        <td>
                          <div className="admin-actions">
                            <Link to={`/admin/catalog/products/${product.id}`}>Manage</Link>
                            {product.status === 'DRAFT' ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void patchProduct(product, { status: 'ACTIVE' })}
                              >
                                Publish
                              </button>
                            ) : null}
                            {product.status === 'ACTIVE' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void patchProduct(product, {
                                      status: 'DRAFT',
                                      isFeatured: false,
                                    })
                                  }
                                >
                                  Unpublish
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void patchProduct(product, {
                                      isFeatured: !product.isFeatured,
                                    })
                                  }
                                >
                                  {product.isFeatured ? 'Unfeature' : 'Feature'}
                                </button>
                              </>
                            ) : null}
                            {product.status === 'ARCHIVED' ? <span>Read only</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {categories.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
          {categories.isError ? (
            <InlineError
              message="Categories could not be loaded."
              onRetry={() => void categories.refetch()}
            />
          ) : null}
          {categories.data ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption className="sr-only">Admin categories</caption>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Parent</th>
                    <th>Order</th>
                    <th>Version</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.data.items.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <strong>{category.name}</strong>
                        <span>{category.slug}</span>
                      </td>
                      <td>
                        <span className="admin-badge" data-status={category.status}>
                          {category.status}
                        </span>
                      </td>
                      <td>{category.parentId ?? 'Root'}</td>
                      <td>{category.sortOrder}</td>
                      <td>{category.version}</td>
                      <td>
                        <Link
                          className="admin-row-link"
                          to={`/admin/catalog/categories/${category.id}`}
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
