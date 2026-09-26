import { Link } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import { useGetOrdersQuery } from '@/features/checkout/checkout-api';
import { orderStatusLabel } from '@/features/checkout/order-presentation';
import { formatPrice } from '@/shared/commerce';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function Component() {
  const orders = useGetOrdersQuery({ page: 1, limit: 20 });

  return (
    <section className="orders-page">
      <PageMeta title="Order history" description="Review your iFixer orders." noIndex />
      <header className="page-intro page-intro--compact">
        <p className="eyebrow">Your account</p>
        <h1>Order history</h1>
        <p>Every iFixer order, payment state and delivery update in one place.</p>
      </header>

      {orders.isLoading ? (
        <div className="orders-loading" aria-busy="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {orders.isError ? (
        <InlineError
          message="Your orders could not be loaded."
          onRetry={() => void orders.refetch()}
        />
      ) : null}
      {orders.data?.items.length ? (
        <div className="order-list">
          {orders.data.items.map((order) => (
            <article className="order-row" key={order.id}>
              <div>
                <p className="eyebrow">{order.orderNumber}</p>
                <h2>
                  {order.items
                    .map((item) => item.productName)
                    .slice(0, 2)
                    .join(', ')}
                </h2>
                <p>{dateFormatter.format(new Date(order.createdAt))}</p>
              </div>
              <div>
                <span className="order-status" data-status={order.lifecycleStatus}>
                  {orderStatusLabel(order)}
                </span>
                <strong>{formatPrice(order.totals.grandTotalInPaise)}</strong>
              </div>
              <Link className="text-link" to={`/orders/${order.orderNumber}`}>
                View order <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
      ) : null}
      {orders.data && !orders.data.items.length ? (
        <div className="orders-empty">
          <p className="eyebrow">No orders yet</p>
          <h2>Your first piece is waiting.</h2>
          <Link className="button button--dark" to="/catalog">
            Explore the collection
          </Link>
        </div>
      ) : null}
    </section>
  );
}
