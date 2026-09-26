import { type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import { useGetAdminReturnsQuery } from '@/features/returns/return-api';
import type { ReturnRequestStatus, ReturnRequestType } from '@/features/returns/return.types';
import { formatPrice } from '@/shared/commerce';

const statuses: Array<ReturnRequestStatus | ''> = [
  '',
  'REQUESTED',
  'APPROVED',
  'RECEIVED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
];
const types: Array<ReturnRequestType | ''> = ['', 'RETURN', 'EXCHANGE'];
const pageLimit = 25;

function allowed<T extends string>(raw: string, values: Array<T | ''>): T | undefined {
  return values.includes(raw as T) && raw ? (raw as T) : undefined;
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const status = allowed(params.get('status') ?? '', statuses);
  const type = allowed(params.get('type') ?? '', types);
  const returns = useGetAdminReturnsQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
    status,
    type,
  });

  function update(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete('page');
    setParams(next);
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Aftercare operations</p>
          <h1>Returns & exchanges</h1>
          <p>Review requests, inspect received pieces, restock safely and close resolutions.</p>
        </div>
      </header>

      <div className="admin-filter-panel admin-filter-panel--returns">
        <form
          key={search}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const value = data.get('search');
            update('search', typeof value === 'string' ? value.trim() : '');
          }}
        >
          <label>
            <span>Search</span>
            <input
              name="search"
              defaultValue={search}
              placeholder="Return, order, product or SKU"
              maxLength={120}
            />
          </label>
          <button type="submit">Search</button>
        </form>
        <label>
          <span>Status</span>
          <select value={status ?? ''} onChange={(event) => update('status', event.target.value)}>
            {statuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.replaceAll('_', ' ') : 'All statuses'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select value={type ?? ''} onChange={(event) => update('type', event.target.value)}>
            {types.map((value) => (
              <option key={value || 'all'} value={value}>
                {value || 'Returns & exchanges'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setParams({})}>
          Clear filters
        </button>
      </div>

      <div className="admin-list-summary" aria-live="polite">
        <span>{returns.data ? `${returns.data.total} requests` : 'Loading requests'}</span>
        {returns.isFetching && !returns.isLoading ? <span>Refreshing…</span> : null}
      </div>
      {returns.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
      {returns.isError ? (
        <InlineError
          message="Return requests could not be loaded."
          onRetry={() => void returns.refetch()}
        />
      ) : null}
      {returns.data ? (
        <>
          <div className="admin-table-wrap" data-refreshing={returns.isFetching}>
            <table className="admin-table">
              <caption className="sr-only">Admin return and exchange requests</caption>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Estimated value</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {returns.data.items.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.returnNumber}</strong>
                      <span>{request.type}</span>
                    </td>
                    <td>{request.orderNumber}</td>
                    <td>
                      <strong>
                        {request.items.reduce((total, item) => total + item.quantity, 0)} units
                      </strong>
                      <span>{request.items.map((item) => item.sku).join(', ')}</span>
                    </td>
                    <td>{formatPrice(request.estimatedTotalInPaise)}</td>
                    <td>
                      <span className="admin-badge" data-status={request.status}>
                        {request.status}
                      </span>
                      {request.exchangeReservation?.status === 'ACTIVE' &&
                      request.exchangeReservation.expiresAt ? (
                        <span>
                          Hold until{' '}
                          {new Date(request.exchangeReservation.expiresAt).toLocaleDateString(
                            'en-IN',
                          )}
                        </span>
                      ) : null}
                    </td>
                    <td>{new Date(request.requestedAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link
                        className="admin-row-link"
                        to={`/admin/returns/${request.returnNumber}`}
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={returns.data.page}
            totalPages={returns.data.totalPages}
            total={returns.data.total}
            limit={returns.data.limit}
            disabled={returns.isFetching}
            onPageChange={(nextPage) => update('page', String(nextPage), false)}
          />
        </>
      ) : null}
    </section>
  );
}
