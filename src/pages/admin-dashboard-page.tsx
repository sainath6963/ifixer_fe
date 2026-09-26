import { Link } from 'react-router-dom';

import {
  useGetAdminCategoriesQuery,
  useGetAdminProductsQuery,
  useGetNotificationOperationsSummaryQuery,
  useGetOrderOperationsSummaryQuery,
} from '@/features/admin/admin-operations-api';
import { useGetSystemReadinessQuery } from '@/features/system/system-health-api';

const readinessServices = [
  ['mongodb', 'MongoDB'],
  ['redis', 'Redis'],
  ['mediaStorage', 'Media storage'],
] as const;

export function Component() {
  const orders = useGetOrderOperationsSummaryQuery();
  const notifications = useGetNotificationOperationsSummaryQuery();
  const products = useGetAdminProductsQuery({ page: 1, limit: 1 });
  const categories = useGetAdminCategoriesQuery({ page: 1, limit: 1 });
  const readiness = useGetSystemReadinessQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const orderSummary = orders.data?.orders;
  const communicationAttention =
    (notifications.data?.notifications.FAILED ?? 0) +
    (notifications.data?.notifications.DEAD ?? 0) +
    (notifications.data?.outbox.FAILED ?? 0) +
    (notifications.data?.outbox.DEAD ?? 0);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Previous store / Overview</p>
          <h1>Store operations.</h1>
          <p>Existing catalog, order and delivery activity.</p>
        </div>
        <span>Updated on request</span>
      </header>

      <Link className="admin-dashboard-analytics-link" to="/admin/analytics">
        <span>Business analytics</span>
        <strong>Explore sales, refunds and customer growth</strong>
        <i aria-hidden="true">↗</i>
      </Link>

      <div className="admin-metrics" aria-label="Operations summary">
        <Link to="/admin/catalog">
          <span>Catalog</span>
          <strong>{products.data?.total ?? '—'}</strong>
          <small>Products</small>
        </Link>
        <Link to="/admin/catalog?view=categories">
          <span>Structure</span>
          <strong>{categories.data?.total ?? '—'}</strong>
          <small>Categories</small>
        </Link>
        <Link to="/admin/orders?fulfillmentStatus=UNFULFILLED">
          <span>Needs fulfilment</span>
          <strong>{orderSummary?.paidUnfulfilled ?? '—'}</strong>
          <small>Paid orders</small>
        </Link>
        <Link to="/admin/notifications">
          <span>Communication</span>
          <strong>{notifications.isError ? '—' : communicationAttention}</strong>
          <small>Failed / dead</small>
        </Link>
      </div>

      <section className="admin-system-health" aria-labelledby="system-health-heading">
        <div>
          <p className="eyebrow">System readiness</p>
          <h2 id="system-health-heading">
            {readiness.isFetching && !readiness.data
              ? 'Checking infrastructure…'
              : readiness.data?.status === 'ok'
                ? 'All core services ready'
                : 'Infrastructure needs attention'}
          </h2>
        </div>
        <div className="admin-system-health__services" aria-label="Core service status">
          {readinessServices.map(([key, label]) => {
            const status = readiness.data?.details[key]?.status;
            return (
              <span key={key} data-status={status ?? 'unknown'}>
                <i aria-hidden="true" />
                {label}: {status === 'up' ? 'Ready' : status === 'down' ? 'Down' : 'Unknown'}
              </span>
            );
          })}
        </div>
        <button
          className="admin-health-refresh"
          type="button"
          onClick={() => void readiness.refetch()}
          disabled={readiness.isFetching}
        >
          {readiness.isFetching ? 'Checking…' : 'Check now'}
        </button>
      </section>

      <div className="admin-dashboard-grid">
        <article>
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Order pipeline</p>
              <h2>Today’s work</h2>
            </div>
            <Link to="/admin/orders">View orders ↗</Link>
          </div>
          <dl className="admin-stat-list">
            <div>
              <dt>Pending payment</dt>
              <dd>{orderSummary?.pendingPayment ?? '—'}</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>{orderSummary?.processing ?? '—'}</dd>
            </div>
            <div>
              <dt>Shipped</dt>
              <dd>{orderSummary?.shipped ?? '—'}</dd>
            </div>
            <div>
              <dt>Delivered</dt>
              <dd>{orderSummary?.delivered ?? '—'}</dd>
            </div>
          </dl>
        </article>
        <article>
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">Risk queue</p>
              <h2>Needs attention</h2>
            </div>
          </div>
          <dl className="admin-stat-list">
            <div>
              <dt>Pending refunds</dt>
              <dd>{orders.data?.refunds.pending ?? '—'}</dd>
            </div>
            <div>
              <dt>Failed refunds</dt>
              <dd>{orders.data?.refunds.failed ?? '—'}</dd>
            </div>
            <div>
              <dt>Late capture alerts</dt>
              <dd>{orders.data?.alerts.lateCapturedNeedsRefund ?? '—'}</dd>
            </div>
            <div>
              <dt>Delivery exceptions</dt>
              <dd>{orders.data?.alerts.deliveryExceptions ?? '—'}</dd>
            </div>
            <div>
              <dt>Communication failures</dt>
              <dd>{notifications.isError ? '—' : communicationAttention}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
