import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import { useGetAdminCustomersQuery } from '@/features/admin-customers/admin-customer-api';
import type { AccountStatus } from '@/features/admin-customers/admin-customer.types';
import { formatPrice } from '@/shared/commerce';

const pageLimit = 20;

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const statusValue = params.get('status');
  const status: AccountStatus | undefined =
    statusValue === 'ACTIVE' || statusValue === 'DISABLED' ? statusValue : undefined;
  const customers = useGetAdminCustomersQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
    status,
  });

  function updateParam(name: string, value: string, resetPage = true) {
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
          <p className="eyebrow">Customer operations</p>
          <h1>Customers</h1>
          <p>Search account identity, verification state and purchase activity.</p>
        </div>
        <span>
          {customers.data ? `${customers.data.pagination.total} profiles` : 'Live profiles'}
        </span>
      </header>

      <div className="admin-toolbar admin-customer-toolbar">
        <label>
          <span>Search customers</span>
          <input
            type="search"
            value={search}
            placeholder="Name, email or mobile"
            onChange={(event) => updateParam('search', event.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="">All accounts</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </label>
      </div>

      {customers.isError ? (
        <InlineError
          message="Customers could not be loaded."
          onRetry={() => void customers.refetch()}
        />
      ) : null}
      {customers.isLoading ? <p className="admin-empty">Loading customers…</p> : null}
      {customers.data?.items.length ? (
        <div className="admin-table-wrap" data-refreshing={customers.isFetching}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Gross paid</th>
                <th>Joined</th>
                <th>Profile</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.items.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name || 'Unnamed customer'}</strong>
                    <small>{customer.id}</small>
                  </td>
                  <td>
                    <strong>{customer.email || customer.mobile || 'No contact'}</strong>
                    <small>
                      Email {customer.emailVerified ? 'verified' : 'unverified'} · Mobile{' '}
                      {customer.mobileVerified ? 'verified' : 'unverified'}
                    </small>
                  </td>
                  <td>
                    <span className="admin-badge">{customer.status}</span>
                  </td>
                  <td>{customer.orderCount}</td>
                  <td>{formatPrice(customer.grossPaidInPaise)}</td>
                  <td>
                    <time dateTime={customer.createdAt}>
                      {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </time>
                  </td>
                  <td>
                    <Link className="admin-row-link" to={`/admin/customers/${customer.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {customers.data && customers.data.pagination.total === 0 ? (
        <p className="admin-empty">No customer profiles match these filters.</p>
      ) : null}
      {customers.data ? (
        <AdminPagination
          page={customers.data.pagination.page}
          totalPages={customers.data.pagination.totalPages}
          total={customers.data.pagination.total}
          limit={customers.data.pagination.limit}
          disabled={customers.isFetching}
          onPageChange={(nextPage) => updateParam('page', String(nextPage), false)}
        />
      ) : null}
    </section>
  );
}
