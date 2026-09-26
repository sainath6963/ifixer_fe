import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import {
  localDayEndIso,
  localDayStartIso,
  positiveAdminPage,
} from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import { useGetAdminOrdersQuery } from '@/features/admin/admin-operations-api';
import type {
  FinancialStatus,
  FulfillmentStatus,
  OrderLifecycleStatus,
} from '@/features/checkout/checkout.types';
import { formatPrice } from '@/shared/commerce';

const lifecycleStatuses: Array<OrderLifecycleStatus | ''> = [
  '',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
];
const financialStatuses: Array<FinancialStatus | ''> = [
  '',
  'UNPAID',
  'PENDING',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
];
const fulfillmentStatuses: Array<FulfillmentStatus | ''> = [
  '',
  'UNFULFILLED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];
const pageLimit = 25;

function allowed<T extends string>(raw: string, values: Array<T | ''>): T | undefined {
  return values.includes(raw as T) && raw ? (raw as T) : undefined;
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const lifecycleStatus = allowed(params.get('lifecycleStatus') ?? '', lifecycleStatuses);
  const financialStatus = allowed(params.get('financialStatus') ?? '', financialStatuses);
  const fulfillmentStatus = allowed(params.get('fulfillmentStatus') ?? '', fulfillmentStatuses);
  const createdFrom = params.get('createdFrom') ?? '';
  const createdTo = params.get('createdTo') ?? '';
  const orders = useGetAdminOrdersQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
    lifecycleStatus,
    financialStatus,
    fulfillmentStatus,
    createdFrom: createdFrom ? localDayStartIso(createdFrom) : undefined,
    createdTo: createdTo ? localDayEndIso(createdTo) : undefined,
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
          <p className="eyebrow">Order operations</p>
          <h1>From paid to delivered</h1>
          <p>Search customers and filter the complete order lifecycle before taking action.</p>
        </div>
      </header>

      <div className="admin-filter-panel">
        <AdminSearchForm
          key={search}
          initialValue={search}
          onSearch={(value) => update('search', value)}
        />
        <label>
          <span>Lifecycle</span>
          <select
            value={lifecycleStatus ?? ''}
            onChange={(event) => update('lifecycleStatus', event.target.value)}
          >
            {lifecycleStatuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.replaceAll('_', ' ') : 'All lifecycle states'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Payment</span>
          <select
            value={financialStatus ?? ''}
            onChange={(event) => update('financialStatus', event.target.value)}
          >
            {financialStatuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.replaceAll('_', ' ') : 'All payment states'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Fulfilment</span>
          <select
            value={fulfillmentStatus ?? ''}
            onChange={(event) => update('fulfillmentStatus', event.target.value)}
          >
            {fulfillmentStatuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? value.replaceAll('_', ' ') : 'All fulfilment states'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Created from</span>
          <input
            type="date"
            value={createdFrom}
            max={createdTo || undefined}
            onChange={(event) => update('createdFrom', event.target.value)}
          />
        </label>
        <label>
          <span>Created to</span>
          <input
            type="date"
            value={createdTo}
            min={createdFrom || undefined}
            onChange={(event) => update('createdTo', event.target.value)}
          />
        </label>
        <button type="button" onClick={() => setParams({})}>
          Clear filters
        </button>
      </div>

      <div className="admin-list-summary" aria-live="polite">
        <span>{orders.data ? `${orders.data.total} orders` : 'Loading orders'}</span>
        {orders.isFetching && !orders.isLoading ? <span>Refreshing…</span> : null}
      </div>

      {orders.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
      {orders.isError ? (
        <InlineError message="Orders could not be loaded." onRetry={() => void orders.refetch()} />
      ) : null}
      {orders.data ? (
        <>
          <div className="admin-table-wrap" data-refreshing={orders.isFetching}>
            <table className="admin-table">
              <caption className="sr-only">Admin orders</caption>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Fulfilment</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.data.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <span>{order.lifecycleStatus.replaceAll('_', ' ')}</span>
                    </td>
                    <td>
                      <strong>{order.customer.name ?? 'Customer'}</strong>
                      <span>{order.customer.email ?? order.customer.mobile}</span>
                    </td>
                    <td>{formatPrice(order.grandTotalInPaise)}</td>
                    <td>
                      <span className="admin-badge" data-status={order.financialStatus}>
                        {order.financialStatus}
                      </span>
                    </td>
                    <td>{order.fulfillmentStatus.replaceAll('_', ' ')}</td>
                    <td>{new Date(order.updatedAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link className="admin-row-link" to={`/admin/orders/${order.orderNumber}`}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            total={orders.data.total}
            limit={orders.data.limit}
            disabled={orders.isFetching}
            onPageChange={(nextPage) => update('page', String(nextPage), false)}
          />
        </>
      ) : null}
    </section>
  );
}

function AdminSearchForm({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="admin-order-search">
        Search orders
      </label>
      <input
        id="admin-order-search"
        type="search"
        value={value}
        maxLength={120}
        placeholder="Order, customer, email, mobile"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
