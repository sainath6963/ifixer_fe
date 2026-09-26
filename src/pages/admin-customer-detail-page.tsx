import { Link, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useGetAdminCustomerQuery } from '@/features/admin-customers/admin-customer-api';
import { formatPrice } from '@/shared/commerce';

export function Component() {
  const { customerId = '' } = useParams();
  const query = useGetAdminCustomerQuery(customerId, { skip: !customerId });
  const customer = query.data?.customer;

  if (query.isLoading) return <p className="admin-empty">Loading customer profile…</p>;
  if (query.isError || !customer) {
    return (
      <InlineError
        message="Customer profile could not be loaded."
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <section className="admin-page admin-customer-detail">
      <Link className="admin-back-link" to="/admin/customers">
        ← Customers
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">Customer profile</p>
          <h1>{customer.name || 'Unnamed customer'}</h1>
          <p>{customer.email || customer.mobile || customer.id}</p>
        </div>
        <span className="admin-badge">{customer.status}</span>
      </header>

      <div className="admin-summary-strip">
        <div>
          <span>Orders</span>
          <strong>{customer.orderCount}</strong>
        </div>
        <div>
          <span>Gross paid</span>
          <strong>{formatPrice(customer.grossPaidInPaise)}</strong>
        </div>
        <div>
          <span>Wishlist</span>
          <strong>{customer.wishlistCount}</strong>
        </div>
        <div>
          <span>Active alerts</span>
          <strong>{customer.activeStockAlertCount}</strong>
        </div>
      </div>

      <div className="admin-detail-grid customer-detail-grid">
        <article className="admin-panel">
          <h2>Identity</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Email</dt>
              <dd>
                {customer.email || 'Not provided'} ·{' '}
                {customer.emailVerified ? 'Verified' : 'Not verified'}
              </dd>
            </div>
            <div>
              <dt>Mobile</dt>
              <dd>
                {customer.mobile || 'Not provided'} ·{' '}
                {customer.mobileVerified ? 'Verified' : 'Not verified'}
              </dd>
            </div>
            <div>
              <dt>Saved addresses</dt>
              <dd>{customer.savedAddressCount}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>
                {new Date(customer.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>
                {customer.lastLoginAt
                  ? new Date(customer.lastLoginAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'No recorded login'}
              </dd>
            </div>
          </dl>
        </article>
        <article className="admin-panel">
          <h2>Communication</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Culture notes</dt>
              <dd>{customer.communicationPreferences.marketingEmail ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Back-in-stock emails</dt>
              <dd>{customer.communicationPreferences.backInStockEmail ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Order updates by SMS</dt>
              <dd>{customer.communicationPreferences.orderUpdatesSms ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt>Order updates on WhatsApp</dt>
              <dd>
                {customer.communicationPreferences.orderUpdatesWhatsapp ? 'Enabled' : 'Disabled'}
              </dd>
            </div>
            {customer.deactivatedAt ? (
              <div>
                <dt>Deactivated</dt>
                <dd>{new Date(customer.deactivatedAt).toLocaleString('en-IN')}</dd>
              </div>
            ) : null}
            {customer.deactivationReason ? (
              <div>
                <dt>Reason</dt>
                <dd>{customer.deactivationReason}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      </div>

      <section className="admin-panel customer-recent-orders">
        <h2>Recent orders</h2>
        {customer.recentOrders.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Lifecycle</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {customer.recentOrders.map((order) => (
                  <tr key={order.orderNumber}>
                    <td>
                      <Link className="admin-row-link" to={`/admin/orders/${order.orderNumber}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <span className="admin-badge">{order.lifecycleStatus}</span>
                    </td>
                    <td>{order.financialStatus}</td>
                    <td>{formatPrice(order.grandTotalInPaise)}</td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No orders yet.</p>
        )}
      </section>
    </section>
  );
}
