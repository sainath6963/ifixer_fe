import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import {
  useCancelOrderMutation,
  useGetOrderQuery,
  useInitiateRazorpayPaymentMutation,
  useVerifyRazorpayPaymentMutation,
} from '@/features/checkout/checkout-api';
import { createPaymentIdempotencyKey } from '@/features/checkout/idempotency';
import {
  orderPaymentAvailable,
  orderStatusLabel,
  paymentTimeRemaining,
} from '@/features/checkout/order-presentation';
import {
  openRazorpayCheckout,
  razorpayCheckoutExpired,
} from '@/features/checkout/razorpay-checkout';
import type { RazorpaySuccessResponse, ShipmentDetails } from '@/features/checkout/checkout.types';
import { CustomerReturnPanel } from '@/features/returns/customer-return-panel';
import { apiErrorMessage, formatPrice } from '@/shared/commerce';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function Component() {
  const { orderNumber = '' } = useParams();
  const location = useLocation();
  const orderQuery = useGetOrderQuery(orderNumber, { skip: !orderNumber });
  const [initiatePayment, initiationState] = useInitiateRazorpayPaymentMutation();
  const [verifyPayment, verificationState] = useVerifyRazorpayPaymentMutation();
  const [cancelOrder, cancellationState] = useCancelOrderMutation();
  const paymentKey = createPaymentIdempotencyKey(orderNumber);
  const verificationStarted = useRef(false);
  const [now, setNow] = useState<number>();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const created = Boolean((location.state as { created?: unknown } | null)?.created);
  const order = orderQuery.data?.order;
  const metadata = (
    <PageMeta
      title={order ? `Order ${order.orderNumber}` : 'Your order'}
      description="Review payment, items and delivery status for your iFixer order."
      noIndex
    />
  );

  useEffect(() => {
    if (!order?.paymentReady) return;
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [order?.paymentReady]);

  async function verify(response: RazorpaySuccessResponse) {
    verificationStarted.current = true;
    setCheckoutOpen(false);
    setPaymentError('');
    setPaymentMessage('Verifying payment securely…');
    try {
      const result = await verifyPayment({ orderNumber, ...response }).unwrap();
      if (result.payment.status === 'CAPTURED' || result.order.financialStatus === 'PAID') {
        setPaymentMessage('Payment confirmed. Your order is now being prepared.');
      } else {
        setPaymentMessage('Payment authorised. Final confirmation is processing.');
      }
      await orderQuery.refetch();
    } catch {
      setPaymentMessage('');
      setPaymentError(
        'Razorpay returned payment details, but confirmation is delayed. Do not pay again; refresh this order shortly.',
      );
      await orderQuery.refetch();
    }
  }

  async function payNow() {
    if (!order) return;
    setPaymentError('');
    setPaymentMessage('Connecting securely to Razorpay…');
    verificationStarted.current = false;
    try {
      const { checkout } = await initiatePayment({
        orderNumber,
        idempotencyKey: paymentKey,
      }).unwrap();
      if (razorpayCheckoutExpired(checkout.expiresAt)) {
        setPaymentMessage('');
        setPaymentError('The payment window expired before Checkout opened.');
        await orderQuery.refetch();
        return;
      }
      setCheckoutOpen(true);
      setPaymentMessage('');
      await openRazorpayCheckout(checkout, {
        onSuccess: (response) => void verify(response),
        onFailure: (message) => {
          setPaymentMessage('');
          setPaymentError(message);
        },
        onDismiss: () => {
          if (verificationStarted.current) return;
          setCheckoutOpen(false);
          setPaymentMessage('Checkout closed. Your order remains reserved until the timer ends.');
        },
      });
    } catch (error) {
      setCheckoutOpen(false);
      setPaymentMessage('');
      setPaymentError(apiErrorMessage(error, 'Secure payment could not be opened. Please retry.'));
    }
  }

  async function cancel() {
    setPaymentError('');
    try {
      await cancelOrder(orderNumber).unwrap();
      setConfirmCancellation(false);
      setPaymentMessage('Order cancelled and reserved inventory released.');
      await orderQuery.refetch();
    } catch (error) {
      setPaymentError(apiErrorMessage(error, 'The order could not be cancelled.'));
    }
  }

  if (orderQuery.isLoading) {
    return (
      <section className="order-page order-page--loading" aria-busy="true">
        {metadata}
        <p className="eyebrow">Order</p>
        <h1>Loading your order…</h1>
      </section>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <section className="order-page">
        {metadata}
        <InlineError
          message="This order could not be loaded."
          onRetry={() => void orderQuery.refetch()}
        />
        <Link className="text-link" to="/account/orders">
          All orders <span aria-hidden="true">↗</span>
        </Link>
      </section>
    );
  }

  const clock = now ?? Number.POSITIVE_INFINITY;
  const payable = orderPaymentAvailable(order, clock);
  const canCancel =
    order.lifecycleStatus === 'PENDING_PAYMENT' &&
    order.financialStatus === 'UNPAID' &&
    new Date(order.paymentExpiresAt).getTime() > clock;

  return (
    <section className="order-page">
      {metadata}
      <header className="order-hero">
        <div>
          <p className="eyebrow">Order {order.orderNumber}</p>
          <h1>{order.financialStatus === 'PAID' ? 'Thank you.' : 'Complete your order.'}</h1>
          <p>Placed {dateTimeFormatter.format(new Date(order.createdAt))}</p>
        </div>
        <span className="order-status" data-status={order.lifecycleStatus}>
          {orderStatusLabel(order)}
        </span>
      </header>

      {created && payable ? (
        <p className="order-created-message" role="status">
          Your pieces are reserved. Complete payment before the reservation expires.
        </p>
      ) : null}
      {paymentMessage ? (
        <p className="auth-message auth-message--success" role="status">
          {paymentMessage}
        </p>
      ) : null}
      {paymentError ? (
        <p className="auth-message" role="alert">
          {paymentError}
        </p>
      ) : null}

      <div className="order-layout">
        <div className="order-main">
          <section className="order-section" aria-labelledby="order-items-title">
            <div className="order-section__heading">
              <p className="eyebrow">Items</p>
              <h2 id="order-items-title">Your selection</h2>
            </div>
            <div className="order-items">
              {order.items.map((item) => (
                <article key={item.variantId}>
                  <div>
                    <p className="eyebrow">{item.variantTitle}</p>
                    <h3>
                      <Link to={`/products/${item.productSlug}`}>{item.productName}</Link>
                    </h3>
                    <p>
                      {item.attributes.map(({ name, value }) => `${name}: ${value}`).join(' / ')}
                    </p>
                  </div>
                  <p>Qty {item.quantity}</p>
                  <strong>{formatPrice(item.lineTotalInPaise)}</strong>
                </article>
              ))}
            </div>
          </section>

          {order.shipping ? <CustomerShipmentTracking shipping={order.shipping} /> : null}

          <section
            className="order-section order-section--address"
            aria-labelledby="delivery-title"
          >
            <div className="order-section__heading">
              <p className="eyebrow">Delivery</p>
              <h2 id="delivery-title">Shipping address</h2>
            </div>
            <address>
              <strong>{order.shippingAddress.fullName}</strong>
              <span>{order.shippingAddress.line1}</span>
              {order.shippingAddress.line2 ? <span>{order.shippingAddress.line2}</span> : null}
              <span>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </span>
              <span>{order.shippingAddress.phone}</span>
            </address>
          </section>
        </div>

        <aside className="order-payment" aria-labelledby="payment-title">
          <p className="eyebrow">Payment</p>
          <h2 id="payment-title">{formatPrice(order.totals.grandTotalInPaise)}</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.totals.subtotalInPaise)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{formatPrice(order.totals.shippingInPaise)}</dd>
            </div>
            {order.coupon ? (
              <div>
                <dt>Coupon · {order.coupon.code}</dt>
                <dd>−{formatPrice(order.coupon.discountInPaise)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Tax</dt>
              <dd>{formatPrice(order.totals.taxInPaise)}</dd>
            </div>
          </dl>

          {payable ? (
            <>
              <p className="payment-countdown" aria-live="off">
                Reservation expires in{' '}
                <strong>{paymentTimeRemaining(order.paymentExpiresAt, clock)}</strong>
              </p>
              <button
                className="button button--dark order-payment__button"
                type="button"
                disabled={initiationState.isLoading || verificationState.isLoading || checkoutOpen}
                onClick={() => void payNow()}
              >
                {verificationState.isLoading
                  ? 'Verifying payment…'
                  : initiationState.isLoading
                    ? 'Opening Razorpay…'
                    : checkoutOpen
                      ? 'Razorpay is open'
                      : 'Pay securely with Razorpay'}
              </button>
              <p>UPI, cards, netbanking and available methods are shown securely by Razorpay.</p>
            </>
          ) : null}

          {order.financialStatus === 'PAID' ? (
            <p className="payment-complete">Payment confirmed. We will update delivery here.</p>
          ) : null}
          {!payable && order.financialStatus !== 'PAID' ? (
            <p className="payment-unavailable">This order is no longer available for payment.</p>
          ) : null}

          {canCancel ? (
            <div className="order-cancel">
              {confirmCancellation ? (
                <>
                  <p>Cancel this unpaid order and release its reserved stock?</p>
                  <div>
                    <button
                      className="text-button"
                      type="button"
                      disabled={cancellationState.isLoading}
                      onClick={() => void cancel()}
                    >
                      {cancellationState.isLoading ? 'Cancelling…' : 'Yes, cancel order'}
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setConfirmCancellation(false)}
                    >
                      Keep order
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setConfirmCancellation(true)}
                >
                  Cancel unpaid order
                </button>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <CustomerReturnPanel order={order} />

      <Link className="text-link order-page__back" to="/account/orders">
        All orders <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}

function CustomerShipmentTracking({ shipping }: { shipping: ShipmentDetails }) {
  return (
    <section className="order-section order-shipment" aria-labelledby="shipment-title">
      <div className="order-section__heading">
        <p className="eyebrow">Tracking</p>
        <h2 id="shipment-title">{shipping.status.replaceAll('_', ' ').toLowerCase()}</h2>
        <p>
          {shipping.courierName} · {shipping.trackingNumber}
        </p>
        {shipping.estimatedDeliveryAt && shipping.status !== 'DELIVERED' ? (
          <p>
            Estimated delivery{' '}
            <strong>{dateTimeFormatter.format(new Date(shipping.estimatedDeliveryAt))}</strong>
          </p>
        ) : null}
        {shipping.trackingUrl ? (
          <a
            className="text-link"
            href={shipping.trackingUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Track with courier <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
      <ol className="shipment-timeline" aria-label="Delivery tracking updates">
        {[...shipping.trackingEvents].reverse().map((event) => (
          <li key={`${event.status}-${event.occurredAt}`}>
            <i aria-hidden="true" />
            <div>
              <strong>{event.status.replaceAll('_', ' ').toLowerCase()}</strong>
              <p>{event.message}</p>
              <span>
                {event.location ? `${event.location} · ` : ''}
                {dateTimeFormatter.format(new Date(event.occurredAt))}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
