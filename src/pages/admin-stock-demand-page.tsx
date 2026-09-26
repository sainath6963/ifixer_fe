import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import { useGetAdminStockDemandQuery } from '@/features/wishlist/wishlist-api';

const pageLimit = 20;

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const demand = useGetAdminStockDemandQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
  });

  function updateParam(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete('page');
    setParams(next);
  }

  return (
    <section className="admin-page admin-stock-demand-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Inventory signal</p>
          <h1>Stock demand</h1>
          <p>See which sold-out options customers are waiting for, ranked by active demand.</p>
        </div>
        <span>{demand.data ? `${demand.data.total} requested options` : 'Live demand'}</span>
      </header>

      <div className="admin-toolbar stock-demand-toolbar">
        <label>
          <span>Search demand</span>
          <input
            type="search"
            value={search}
            placeholder="Product, option or SKU"
            onChange={(event) => updateParam('search', event.target.value)}
          />
        </label>
      </div>

      {demand.isError ? (
        <InlineError
          message="Stock demand could not be loaded."
          onRetry={() => void demand.refetch()}
        />
      ) : null}
      {demand.isLoading ? <p className="admin-empty">Loading customer demand…</p> : null}
      {demand.data?.items.length ? (
        <div className="stock-demand-table-wrap">
          <table className="stock-demand-table">
            <thead>
              <tr>
                <th>Product / option</th>
                <th>SKU</th>
                <th>Waiting</th>
                <th>Available</th>
                <th>Latest request</th>
              </tr>
            </thead>
            <tbody>
              {demand.data.items.map((item) => (
                <tr key={item.variantId}>
                  <td>
                    <Link to={`/admin/catalog/products/${item.productId}`}>{item.productName}</Link>
                    <span>{item.variantTitle}</span>
                  </td>
                  <td>{item.sku}</td>
                  <td>
                    <strong>{item.subscriberCount}</strong>
                  </td>
                  <td>{item.available}</td>
                  <td>
                    <time dateTime={item.lastRequestedAt}>
                      {new Date(item.lastRequestedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {demand.data && demand.data.total === 0 ? (
        <p className="admin-empty">No active stock-alert demand matches this search.</p>
      ) : null}
      {demand.data ? (
        <AdminPagination
          page={demand.data.page}
          totalPages={demand.data.totalPages}
          total={demand.data.total}
          limit={demand.data.limit}
          disabled={demand.isFetching}
          onPageChange={(nextPage) => updateParam('page', String(nextPage), false)}
        />
      ) : null}
    </section>
  );
}
