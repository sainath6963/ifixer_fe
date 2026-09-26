import { type FormEvent, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import { adminIdempotencyKey, rupeesToPaise } from '@/features/admin/admin-form-utils';
import {
  useCreateOrderShipmentMutation,
  useGetAdminOrderQuery,
  useRequestAdminRefundMutation,
  useUpdateOrderAdminNoteMutation,
  useUpdateOrderFulfillmentMutation,
  useUpdateOrderShipmentStatusMutation,
} from '@/features/admin/admin-operations-api';
import type { AdminOrderDetail } from '@/features/admin/admin.types';
import type {
  FulfillmentStatus,
  ShipmentDetails,
  ShipmentStatus,
} from '@/features/checkout/checkout.types';
import { apiErrorMessage, formatPrice } from '@/shared/commerce';

const fulfillmentTransitions: Partial<Record<FulfillmentStatus, FulfillmentStatus[]>> = {
  UNFULFILLED: ['PROCESSING', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
};
const shipmentTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  READY_TO_SHIP: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_EXCEPTION', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERY_EXCEPTION', 'DELIVERED'],
  DELIVERY_EXCEPTION: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  DELIVERED: [],
};

const shipmentDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function statusLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

function formText(data: FormData, field: string) {
  const value = data.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

export function Component() {
  const { orderNumber = '' } = useParams();
  const query = useGetAdminOrderQuery(orderNumber, { skip: !orderNumber });
  const [updateFulfillment, fulfillmentState] = useUpdateOrderFulfillmentMutation();
  const [createShipment, createShipmentState] = useCreateOrderShipmentMutation();
  const [updateShipment, updateShipmentState] = useUpdateOrderShipmentStatusMutation();
  const [updateNote, noteState] = useUpdateOrderAdminNoteMutation();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const order = query.data?.order;

  async function saveFulfillment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const data = new FormData(event.currentTarget);
    const status = formText(data, 'status') as FulfillmentStatus;
    const courierName = formText(data, 'courierName');
    const trackingNumber = formText(data, 'trackingNumber');
    const trackingUrl = formText(data, 'trackingUrl');
    const reason = formText(data, 'reason');
    setErrorMessage('');
    setMessage('');
    try {
      await updateFulfillment({
        orderNumber,
        expectedVersion: order.version,
        status,
        ...(courierName ? { courierName } : {}),
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(trackingUrl ? { trackingUrl } : {}),
        ...(reason ? { reason } : {}),
      }).unwrap();
      setMessage('Fulfilment state updated.');
      await query.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Fulfilment could not be updated.'));
    }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const data = new FormData(event.currentTarget);
    const adminNote = formText(data, 'adminNote');
    setErrorMessage('');
    setMessage('');
    try {
      await updateNote({
        orderNumber,
        expectedVersion: order.version,
        adminNote,
      }).unwrap();
      setMessage(adminNote ? 'Private note saved.' : 'Private note cleared.');
      await query.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'The private note could not be saved.'));
    }
  }

  async function saveShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const estimatedDelivery = formText(data, 'estimatedDeliveryAt');
    setErrorMessage('');
    setMessage('');
    try {
      await createShipment({
        orderNumber,
        expectedVersion: order.version,
        courierName: formText(data, 'courierName'),
        trackingNumber: formText(data, 'trackingNumber'),
        trackingUrl: formText(data, 'trackingUrl') || undefined,
        serviceLevel: formText(data, 'serviceLevel') || undefined,
        estimatedDeliveryAt: estimatedDelivery
          ? new Date(estimatedDelivery).toISOString()
          : undefined,
      }).unwrap();
      form.reset();
      setMessage('Shipment created and ready for courier handover.');
      await query.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Shipment could not be created.'));
    }
  }

  async function saveShipmentEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order?.shipping) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setErrorMessage('');
    setMessage('');
    try {
      await updateShipment({
        orderNumber,
        expectedVersion: order.version,
        status: formText(data, 'shipmentStatus') as ShipmentStatus,
        message: formText(data, 'shipmentMessage'),
        location: formText(data, 'shipmentLocation') || undefined,
      }).unwrap();
      form.reset();
      setMessage('Shipment tracking event recorded.');
      await query.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Shipment event could not be recorded.'));
    }
  }

  if (query.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (query.isError || !order) {
    return (
      <section className="admin-page">
        <InlineError
          message="Order detail could not be loaded."
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="admin-page">
      <Link className="admin-back-link" to="/admin/orders">
        ← All orders
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">{order.orderNumber}</p>
          <h1>{order.customer.name ?? 'Customer order'}</h1>
          <p>{order.customer.email ?? order.customer.mobile}</p>
        </div>
        <div className="admin-detail-statuses">
          <span className="admin-badge" data-status={order.financialStatus}>
            {order.financialStatus}
          </span>
          <span className="admin-badge">{order.fulfillmentStatus}</span>
        </div>
      </header>

      {message ? (
        <p className="admin-alert admin-alert--success" role="status">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="admin-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="admin-order-layout">
        <div>
          <article className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Items</p>
                <h2>Order contents</h2>
              </div>
              <strong>{formatPrice(order.totals.grandTotalInPaise)}</strong>
            </div>
            <div className="admin-order-items">
              {order.items.map((item) => (
                <div key={item.variantId}>
                  <p>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.variantTitle} / {item.sku}
                    </span>
                  </p>
                  <span>× {item.quantity}</span>
                  <strong>{formatPrice(item.lineTotalInPaise)}</strong>
                </div>
              ))}
            </div>
            {order.coupon ? (
              <div className="admin-order-coupon">
                <div>
                  <span>Coupon</span>
                  <strong>{order.coupon.code}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>−{formatPrice(order.coupon.discountInPaise)}</strong>
                </div>
              </div>
            ) : null}
          </article>

          <article className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Delivery</p>
                <h2>Customer address</h2>
              </div>
            </div>
            <address className="admin-address">
              <strong>{order.shippingAddress.fullName}</strong>
              <span>{order.shippingAddress.line1}</span>
              {order.shippingAddress.line2 ? <span>{order.shippingAddress.line2}</span> : null}
              <span>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </span>
              <span>{order.shippingAddress.phone}</span>
            </address>
          </article>

          <article className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Payment</p>
                <h2>Provider record</h2>
              </div>
            </div>
            {order.payment ? (
              <dl className="admin-detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>{order.payment.status}</dd>
                </div>
                <div>
                  <dt>Provider order</dt>
                  <dd>{order.payment.providerOrderId ?? '—'}</dd>
                </div>
                <div>
                  <dt>Provider payment</dt>
                  <dd>{order.payment.providerPaymentId ?? '—'}</dd>
                </div>
                <div>
                  <dt>Signature</dt>
                  <dd>{order.payment.signatureVerified ? 'Verified' : 'Not verified'}</dd>
                </div>
                <div>
                  <dt>Refunded</dt>
                  <dd>{formatPrice(order.payment.refundedInPaise)}</dd>
                </div>
              </dl>
            ) : (
              <p>No payment attempt recorded.</p>
            )}
          </article>

          {order.shipping ? <AdminShipmentOverview shipping={order.shipping} /> : null}
        </div>

        <aside className="admin-order-actions">
          {(fulfillmentTransitions[order.fulfillmentStatus]?.length ?? 0) > 0 ? (
            <form
              key={`fulfilment-${order.version}`}
              className="admin-form"
              onSubmit={(event) => void saveFulfillment(event)}
            >
              <div>
                <p className="eyebrow">Fulfilment</p>
                <h2>Prepare the order</h2>
              </div>
              <label>
                <span>Next state</span>
                <select name="status" required>
                  {fulfillmentTransitions[order.fulfillmentStatus]?.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Reason / note</span>
                <textarea name="reason" maxLength={500} />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={fulfillmentState.isLoading}
              >
                {fulfillmentState.isLoading ? 'Updating…' : 'Update fulfilment'}
              </button>
            </form>
          ) : null}

          {!order.shipping && order.fulfillmentStatus === 'PROCESSING' ? (
            <form className="admin-form" onSubmit={(event) => void saveShipment(event)}>
              <div>
                <p className="eyebrow">Shipment</p>
                <h2>Book manual courier</h2>
                <p>Enter the AWB supplied by your courier portal.</p>
              </div>
              <label>
                <span>Courier name</span>
                <input name="courierName" minLength={2} maxLength={100} required />
              </label>
              <label>
                <span>AWB / tracking number</span>
                <input
                  name="trackingNumber"
                  minLength={3}
                  maxLength={160}
                  pattern="[A-Za-z0-9][A-Za-z0-9./_-]{2,159}"
                  required
                />
              </label>
              <label>
                <span>Service level</span>
                <input name="serviceLevel" minLength={2} maxLength={100} placeholder="Surface" />
              </label>
              <label>
                <span>Tracking URL</span>
                <input
                  type="url"
                  name="trackingUrl"
                  maxLength={500}
                  pattern="https://.*"
                  placeholder="https://"
                />
              </label>
              <label>
                <span>Estimated delivery</span>
                <input type="datetime-local" name="estimatedDeliveryAt" />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={createShipmentState.isLoading}
              >
                {createShipmentState.isLoading ? 'Creating…' : 'Create shipment'}
              </button>
            </form>
          ) : null}

          {order.shipping && shipmentTransitions[order.shipping.status].length ? (
            <form
              key={`shipment-${order.version}`}
              className="admin-form"
              onSubmit={(event) => void saveShipmentEvent(event)}
            >
              <div>
                <p className="eyebrow">Tracking</p>
                <h2>Record courier event</h2>
              </div>
              <label>
                <span>Next shipment state</span>
                <select name="shipmentStatus" required>
                  {shipmentTransitions[order.shipping.status].map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Customer-safe update</span>
                <textarea name="shipmentMessage" minLength={3} maxLength={240} required />
              </label>
              <label>
                <span>Location</span>
                <input name="shipmentLocation" minLength={2} maxLength={160} />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={updateShipmentState.isLoading}
              >
                {updateShipmentState.isLoading ? 'Recording…' : 'Add tracking event'}
              </button>
            </form>
          ) : null}

          <form
            key={`note-${order.version}`}
            className="admin-form"
            onSubmit={(event) => void saveNote(event)}
          >
            <div>
              <p className="eyebrow">Private</p>
              <h2>Admin note</h2>
            </div>
            <label>
              <span>Internal note</span>
              <textarea
                name="adminNote"
                defaultValue={order.adminNote ?? ''}
                maxLength={2000}
                rows={6}
              />
            </label>
            <button className="button" type="submit" disabled={noteState.isLoading}>
              {noteState.isLoading ? 'Saving…' : 'Save private note'}
            </button>
          </form>

          <RefundPanel order={order} />
        </aside>
      </div>
    </section>
  );
}

function AdminShipmentOverview({ shipping }: { shipping: ShipmentDetails }) {
  return (
    <article className="admin-panel admin-shipment-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Shipment tracking</p>
          <h2>{statusLabel(shipping.status)}</h2>
        </div>
        <span className="admin-badge" data-status={shipping.status}>
          {shipping.provider}
        </span>
      </div>
      <dl className="admin-detail-list admin-shipment-facts">
        <div>
          <dt>Courier</dt>
          <dd>{shipping.courierName}</dd>
        </div>
        <div>
          <dt>AWB</dt>
          <dd>{shipping.trackingNumber}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{shipping.serviceLevel ?? '—'}</dd>
        </div>
        <div>
          <dt>Estimate</dt>
          <dd>
            {shipping.estimatedDeliveryAt
              ? shipmentDateFormatter.format(new Date(shipping.estimatedDeliveryAt))
              : '—'}
          </dd>
        </div>
      </dl>
      {shipping.trackingUrl ? (
        <a
          className="text-link admin-shipment-link"
          href={shipping.trackingUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open courier tracking <span aria-hidden="true">↗</span>
        </a>
      ) : null}
      <ol className="shipment-timeline" aria-label="Shipment tracking history">
        {[...shipping.trackingEvents].reverse().map((event) => (
          <li key={`${event.status}-${event.occurredAt}`}>
            <i aria-hidden="true" />
            <div>
              <strong>{statusLabel(event.status)}</strong>
              <p>{event.message}</p>
              <span>
                {event.location ? `${event.location} · ` : ''}
                {shipmentDateFormatter.format(new Date(event.occurredAt))}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function RefundPanel({ order }: { order: AdminOrderDetail }) {
  const isOwner = useAppSelector((state) => state.session.admin?.roles.includes('OWNER') ?? false);
  const [requestRefund, refundState] = useRequestAdminRefundMutation();
  const request = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const availableInPaise = Math.max(
    0,
    order.payment
      ? order.payment.amountInPaise -
          order.payment.refundedInPaise -
          order.payment.refundPendingInPaise
      : 0,
  );
  const canRefund = Boolean(
    isOwner &&
    order.payment?.status === 'CAPTURED' &&
    order.payment.providerPaymentId &&
    availableInPaise > 0,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountInPaise = rupeesToPaise(formText(data, 'refundAmount'));
    const reason = formText(data, 'refundReason');
    if (!amountInPaise || amountInPaise > availableInPaise) {
      setErrorMessage(`Enter an amount up to ${formatPrice(availableInPaise)}.`);
      return;
    }
    if (reason.length < 10) {
      setErrorMessage('Refund reason must contain at least 10 characters.');
      return;
    }
    if (data.get('confirmRefund') !== 'on') {
      setErrorMessage('Confirm that you understand the refund is irreversible.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    const fingerprint = `${order.version}:${amountInPaise}:${reason}`;
    if (request.current?.fingerprint !== fingerprint) {
      request.current = { fingerprint, key: adminIdempotencyKey('refund') };
    }
    try {
      const result = await requestRefund({
        orderNumber: order.orderNumber,
        expectedOrderVersion: order.version,
        amountInPaise,
        reason,
        idempotencyKey: request.current.key,
      }).unwrap();
      request.current = undefined;
      event.currentTarget.reset();
      setMessage(`Refund ${result.refund.refundNumber} is ${result.refund.status.toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'Refund request failed. Retrying this unchanged request is safe.'),
      );
    }
  }

  return (
    <section className="admin-form admin-refund-panel">
      <div>
        <p className="eyebrow">Razorpay</p>
        <h2>Refunds</h2>
      </div>
      {order.refunds.length ? (
        <div className="admin-refund-list">
          {order.refunds.map((refund) => (
            <article key={refund.id}>
              <div>
                <strong>{refund.refundNumber}</strong>
                <span>{refund.reason}</span>
              </div>
              <div>
                <strong>{formatPrice(refund.amountInPaise)}</strong>
                <span className="admin-badge" data-status={refund.status}>
                  {refund.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p>No refunds requested.</p>
      )}

      {message ? <p className="admin-inline-success">{message}</p> : null}
      {errorMessage ? <p className="admin-inline-error">{errorMessage}</p> : null}

      {canRefund ? (
        <form className="admin-refund-form" onSubmit={(event) => void submit(event)}>
          <p>
            Refundable now: <strong>{formatPrice(availableInPaise)}</strong>
          </p>
          <label>
            <span>Refund amount ₹</span>
            <input
              name="refundAmount"
              inputMode="decimal"
              pattern="\d+(?:\.\d{1,2})?"
              placeholder={(availableInPaise / 100).toFixed(2)}
              required
            />
          </label>
          <label>
            <span>Reason</span>
            <textarea name="refundReason" minLength={10} maxLength={500} rows={4} required />
          </label>
          <label className="admin-check-field admin-check-field--danger">
            <input name="confirmRefund" type="checkbox" required />I understand this sends an
            irreversible Razorpay refund
          </label>
          <button className="button" type="submit" disabled={refundState.isLoading}>
            {refundState.isLoading ? 'Requesting refund…' : 'Issue refund'}
          </button>
        </form>
      ) : (
        <small>
          {isOwner
            ? 'No captured refundable amount is available.'
            : 'Only an OWNER can issue a refund.'}
        </small>
      )}
    </section>
  );
}
