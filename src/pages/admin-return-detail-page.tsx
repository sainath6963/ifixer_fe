import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import { useGetAdminOrderQuery } from '@/features/admin/admin-operations-api';
import {
  useCompleteAdminReturnMutation,
  useDecideAdminReturnMutation,
  useGetAdminReturnEvidenceQuery,
  useGetAdminReturnQuery,
  useReceiveAdminReturnMutation,
} from '@/features/returns/return-api';
import { apiErrorMessage, formatPrice, resolveMediaUrl } from '@/shared/commerce';

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function Component() {
  const { returnNumber = '' } = useParams();
  const query = useGetAdminReturnQuery(returnNumber, { skip: !returnNumber });
  const evidenceQuery = useGetAdminReturnEvidenceQuery(returnNumber, { skip: !returnNumber });
  const request = query.data;
  const orderQuery = useGetAdminOrderQuery(request?.orderNumber ?? '', {
    skip: !request?.orderNumber,
  });
  const [decide, decisionState] = useDecideAdminReturnMutation();
  const [receive, receiveState] = useReceiveAdminReturnMutation();
  const [complete, completeState] = useCompleteAdminReturnMutation();
  const isOwner = useAppSelector((state) => state.session.admin?.roles.includes('OWNER') ?? false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage('');
    setErrorMessage('');
    try {
      await action();
      setMessage(success);
      await query.refetch();
      if (request?.orderNumber) await orderQuery.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'The return request could not be updated.'));
    }
  }

  function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    const data = new FormData(event.currentTarget);
    const status = text(data, 'status') as 'APPROVED' | 'REJECTED';
    void run(
      () =>
        decide({
          returnNumber,
          expectedVersion: request.version,
          status,
          customerMessage: text(data, 'customerMessage') || undefined,
          internalNote: text(data, 'internalNote') || undefined,
        }).unwrap(),
      status === 'APPROVED' ? 'Request approved.' : 'Request rejected.',
    );
  }

  function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    const data = new FormData(event.currentTarget);
    void run(
      () =>
        receive({
          returnNumber,
          expectedVersion: request.version,
          items: request.items.map((item) => ({
            variantId: item.variantId,
            restockQuantity: Number(data.get(`restock:${item.variantId}`) ?? 0),
          })),
          customerMessage: text(data, 'customerMessage') || undefined,
          internalNote: text(data, 'internalNote') || undefined,
        }).unwrap(),
      'Parcel inspected and inventory updated.',
    );
  }

  function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    const data = new FormData(event.currentTarget);
    void run(
      () =>
        complete({
          returnNumber,
          expectedVersion: request.version,
          resolutionType: request.type === 'RETURN' ? 'REFUND' : 'EXCHANGE',
          refundId: text(data, 'refundId') || undefined,
          courierName: text(data, 'courierName') || undefined,
          trackingNumber: text(data, 'trackingNumber') || undefined,
          trackingUrl: text(data, 'trackingUrl') || undefined,
          customerMessage: text(data, 'customerMessage') || undefined,
          internalNote: text(data, 'internalNote') || undefined,
        }).unwrap(),
      'Return request completed.',
    );
  }

  if (query.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (query.isError || !request) {
    return (
      <section className="admin-page">
        <InlineError
          message="Return request could not be loaded."
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  const settledRefunds =
    orderQuery.data?.order.refunds.filter((refund) => refund.status === 'SUCCEEDED') ?? [];

  return (
    <section className="admin-page">
      <Link className="admin-back-link" to="/admin/returns">
        ← All returns
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">{request.returnNumber}</p>
          <h1>{request.type === 'RETURN' ? 'Customer return' : 'Customer exchange'}</h1>
          <p>
            Order{' '}
            <Link className="text-link" to={`/admin/orders/${request.orderNumber}`}>
              {request.orderNumber}
            </Link>
          </p>
        </div>
        <span className="admin-badge" data-status={request.status}>
          {request.status}
        </span>
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
                <p className="eyebrow">Requested pieces</p>
                <h2>Inspection manifest</h2>
              </div>
              <strong>{formatPrice(request.estimatedTotalInPaise)}</strong>
            </div>
            <div className="admin-order-items admin-return-items">
              {request.items.map((item) => (
                <div key={item.variantId}>
                  <p>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.variantTitle} / {item.sku} · {item.reason.replaceAll('_', ' ')}
                    </span>
                    {item.reasonDetail ? <small>{item.reasonDetail}</small> : null}
                    {item.requestedExchangeVariant ? (
                      <small>
                        Requested replacement: {item.requestedExchangeVariant.title} /{' '}
                        {item.requestedExchangeVariant.sku}
                      </small>
                    ) : null}
                  </p>
                  <span>× {item.quantity}</span>
                  <strong>{formatPrice(item.estimatedValueInPaise)}</strong>
                </div>
              ))}
            </div>
            {request.customerNote ? <p>Customer note: {request.customerNote}</p> : null}
            {request.internalNote ? <p>Private note: {request.internalNote}</p> : null}
            {request.exchangeReservation ? (
              <div
                className="admin-exchange-reservation"
                data-status={request.exchangeReservation.status}
              >
                <strong>Replacement stock: {request.exchangeReservation.status}</strong>
                {request.exchangeReservation.expiresAt ? (
                  <span>
                    Approval hold deadline:{' '}
                    {new Date(request.exchangeReservation.expiresAt).toLocaleString('en-IN')}
                  </span>
                ) : null}
                {request.exchangeReservation.finalizedAt ? (
                  <span>
                    Finalized:{' '}
                    {new Date(request.exchangeReservation.finalizedAt).toLocaleString('en-IN')}
                  </span>
                ) : null}
              </div>
            ) : request.type === 'EXCHANGE' && request.status !== 'REQUESTED' ? (
              <p className="admin-exchange-reservation" data-status="LEGACY">
                Legacy exchange: replacement stock was not reserved by this workflow.
              </p>
            ) : null}
          </article>

          <article className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Private uploads</p>
                <h2>Customer evidence</h2>
              </div>
              <strong>{evidenceQuery.data?.length ?? 0} photos</strong>
            </div>
            {evidenceQuery.isError ? (
              <InlineError
                message="Evidence could not be loaded."
                onRetry={() => void evidenceQuery.refetch()}
              />
            ) : evidenceQuery.data?.length ? (
              <div className="admin-return-evidence">
                {evidenceQuery.data.map((item) => (
                  <figure key={item.id}>
                    <a href={resolveMediaUrl(item.contentUrl)} target="_blank" rel="noreferrer">
                      <img
                        src={resolveMediaUrl(item.contentUrl)}
                        alt={item.originalFilename}
                        loading="lazy"
                      />
                    </a>
                    <figcaption>
                      <span>{item.originalFilename}</span>
                      <small>
                        {item.width} × {item.height} · {Math.ceil(item.sizeBytes / 1024)} KB
                      </small>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p>No evidence photos were attached.</p>
            )}
          </article>

          <article className="admin-panel">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Timeline</p>
                <h2>Request history</h2>
              </div>
            </div>
            <ol className="admin-return-timeline">
              {request.statusHistory.map((entry, index) => (
                <li key={`${entry.status}-${entry.occurredAt}-${index}`}>
                  <strong>{entry.status}</strong>
                  <span>{new Date(entry.occurredAt).toLocaleString('en-IN')}</span>
                  {entry.message ? <p>{entry.message}</p> : null}
                </li>
              ))}
            </ol>
          </article>
        </div>

        <aside className="admin-order-actions">
          {request.status === 'REQUESTED' ? (
            <form className="admin-form" onSubmit={submitDecision}>
              <div>
                <p className="eyebrow">Decision</p>
                <h2>Review request</h2>
              </div>
              <label>
                <span>Decision</span>
                <select name="status" defaultValue="APPROVED">
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                </select>
              </label>
              <label>
                <span>Customer message (required when rejected)</span>
                <textarea name="customerMessage" maxLength={1000} rows={4} />
              </label>
              <label>
                <span>Private note</span>
                <textarea name="internalNote" maxLength={2000} rows={4} />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={decisionState.isLoading}
              >
                {decisionState.isLoading ? 'Saving…' : 'Save decision'}
              </button>
            </form>
          ) : null}

          {request.status === 'APPROVED' ? (
            <form className="admin-form" onSubmit={submitReceipt}>
              <div>
                <p className="eyebrow">Warehouse inspection</p>
                <h2>Receive parcel</h2>
                <p>Only resaleable quantities are returned to on-hand stock.</p>
              </div>
              {request.items.map((item) => (
                <label key={item.variantId}>
                  <span>
                    Restock {item.sku} (received {item.quantity})
                  </span>
                  <input
                    type="number"
                    name={`restock:${item.variantId}`}
                    defaultValue={item.quantity}
                    min={0}
                    max={item.quantity}
                    step={1}
                    required
                  />
                </label>
              ))}
              <label>
                <span>Customer message</span>
                <textarea name="customerMessage" maxLength={1000} rows={3} />
              </label>
              <label>
                <span>Inspection note</span>
                <textarea name="internalNote" maxLength={2000} rows={4} />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={receiveState.isLoading}
              >
                {receiveState.isLoading ? 'Receiving…' : 'Confirm receipt'}
              </button>
            </form>
          ) : null}

          {request.status === 'RECEIVED' ? (
            <form className="admin-form" onSubmit={submitCompletion}>
              <div>
                <p className="eyebrow">Owner resolution</p>
                <h2>Complete {request.type.toLowerCase()}</h2>
              </div>
              {!isOwner ? <p>An owner must complete the final resolution.</p> : null}
              {request.type === 'RETURN' ? (
                <label>
                  <span>Succeeded Razorpay refund</span>
                  <select name="refundId" defaultValue="" required>
                    <option value="">Choose refund</option>
                    {settledRefunds.map((refund) => (
                      <option key={refund.id} value={refund.id}>
                        {refund.refundNumber} · {formatPrice(refund.amountInPaise)}
                      </option>
                    ))}
                  </select>
                  {!settledRefunds.length ? (
                    <small>Issue and settle the refund from the order page first.</small>
                  ) : null}
                </label>
              ) : (
                <>
                  <label>
                    <span>Replacement courier</span>
                    <input name="courierName" maxLength={100} required />
                  </label>
                  <label>
                    <span>Tracking number</span>
                    <input name="trackingNumber" maxLength={160} required />
                  </label>
                  <label>
                    <span>Tracking URL (optional)</span>
                    <input name="trackingUrl" type="url" maxLength={500} placeholder="https://" />
                  </label>
                </>
              )}
              <label>
                <span>Customer message</span>
                <textarea name="customerMessage" maxLength={1000} rows={3} />
              </label>
              <label>
                <span>Private note</span>
                <textarea name="internalNote" maxLength={2000} rows={4} />
              </label>
              <button
                className="button button--dark"
                type="submit"
                disabled={!isOwner || completeState.isLoading}
              >
                {completeState.isLoading ? 'Completing…' : 'Complete request'}
              </button>
            </form>
          ) : null}

          {['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(request.status) ? (
            <article className="admin-panel">
              <p className="eyebrow">Closed</p>
              <h2>{request.status.replaceAll('_', ' ')}</h2>
              {request.customerMessage ? <p>{request.customerMessage}</p> : null}
              {request.resolution?.trackingNumber ? (
                <p>
                  {request.resolution.courierName} · {request.resolution.trackingNumber}
                </p>
              ) : null}
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
