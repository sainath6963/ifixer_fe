import { type FormEvent, useRef, useState } from 'react';

import type { CustomerOrder } from '@/features/checkout/checkout.types';
import { apiErrorMessage, formatPrice, resolveMediaUrl } from '@/shared/commerce';

import {
  returnIdempotencyKey,
  useCancelCustomerReturnMutation,
  useCreateCustomerReturnMutation,
  useDeleteCustomerReturnEvidenceMutation,
  useGetCustomerReturnEvidenceQuery,
  useGetCustomerReturnsQuery,
  useUploadCustomerReturnEvidenceMutation,
} from './return-api';
import type {
  CreateReturnRequestInput,
  ReturnReason,
  ReturnRequest,
  ReturnRequestType,
} from './return.types';

const reasons: Array<{ value: ReturnReason; label: string }> = [
  { value: 'SIZE_ISSUE', label: 'Size or fit issue' },
  { value: 'DAMAGED', label: 'Damaged on arrival' },
  { value: 'WRONG_ITEM', label: 'Wrong item received' },
  { value: 'QUALITY_ISSUE', label: 'Quality issue' },
  { value: 'CHANGED_MIND', label: 'Changed my mind' },
  { value: 'OTHER', label: 'Other reason' },
];

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function textValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function CustomerReturnEvidence({
  orderNumber,
  request,
}: {
  orderNumber: string;
  request: ReturnRequest;
}) {
  const evidence = useGetCustomerReturnEvidenceQuery({
    orderNumber,
    returnNumber: request.returnNumber,
  });
  const [upload, uploadState] = useUploadCustomerReturnEvidenceMutation();
  const [remove, removeState] = useDeleteCustomerReturnEvidenceMutation();
  const [selectedFile, setSelectedFile] = useState<File>();
  const [errorMessage, setErrorMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const editable = request.status === 'REQUESTED';

  async function uploadSelected() {
    if (!selectedFile) return;
    setErrorMessage('');
    try {
      await upload({
        orderNumber,
        returnNumber: request.returnNumber,
        file: selectedFile,
      }).unwrap();
      setSelectedFile(undefined);
      if (input.current) input.current.value = '';
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'The evidence photo could not be uploaded.'));
    }
  }

  async function removeEvidence(evidenceId: string) {
    setErrorMessage('');
    try {
      await remove({ orderNumber, returnNumber: request.returnNumber, evidenceId }).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'The evidence photo could not be removed.'));
    }
  }

  return (
    <section className="return-evidence" aria-label={`Evidence for ${request.returnNumber}`}>
      <div className="return-evidence__heading">
        <strong>Private evidence</strong>
        <span>{evidence.data?.length ?? 0} / 5 photos</span>
      </div>
      {evidence.isError ? (
        <p>Evidence is temporarily unavailable.</p>
      ) : evidence.data?.length ? (
        <div className="return-evidence__grid">
          {evidence.data.map((item) => (
            <figure key={item.id}>
              <img
                src={resolveMediaUrl(item.contentUrl)}
                alt={item.originalFilename}
                loading="lazy"
              />
              <figcaption>
                <span>{item.originalFilename}</span>
                {editable ? (
                  <button
                    className="text-button"
                    type="button"
                    disabled={removeState.isLoading}
                    onClick={() => void removeEvidence(item.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p>No evidence photos attached.</p>
      )}
      {editable && (evidence.data?.length ?? 0) < 5 ? (
        <div className="return-evidence__upload">
          <label>
            <span>Add JPEG, PNG, WebP or AVIF (max 5 MB)</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => setSelectedFile(event.target.files?.[0])}
            />
          </label>
          <button
            className="button"
            type="button"
            disabled={!selectedFile || uploadState.isLoading}
            onClick={() => void uploadSelected()}
          >
            {uploadState.isLoading ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>
      ) : null}
      {errorMessage ? (
        <p className="auth-message" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

export function CustomerReturnPanel({ order }: { order: CustomerOrder }) {
  const query = useGetCustomerReturnsQuery(order.orderNumber);
  const [createReturn, createState] = useCreateCustomerReturnMutation();
  const [cancelReturn, cancelState] = useCancelCustomerReturnMutation();
  const [requestType, setRequestType] = useState<ReturnRequestType>('RETURN');
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const pendingRequest = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const data = query.data;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    const items: CreateReturnRequestInput['items'] = [];
    for (const item of data.eligibility.items) {
      const quantity = Number(form.get(`quantity:${item.variantId}`) ?? 0);
      if (!Number.isInteger(quantity) || quantity < 1) continue;
      const requestedExchangeVariantId = textValue(form, `exchange:${item.variantId}`);
      if (requestType === 'EXCHANGE' && !requestedExchangeVariantId) {
        setErrorMessage(`Choose a replacement variant for ${item.productName}.`);
        return;
      }
      items.push({
        variantId: item.variantId,
        quantity,
        reason: textValue(form, `reason:${item.variantId}`) as ReturnReason,
        reasonDetail: textValue(form, `detail:${item.variantId}`) || undefined,
        requestedExchangeVariantId:
          requestType === 'EXCHANGE' ? requestedExchangeVariantId : undefined,
      });
    }
    if (!items.length) {
      setErrorMessage('Choose at least one item quantity.');
      return;
    }
    const body: CreateReturnRequestInput = {
      type: requestType,
      items,
      customerNote: textValue(form, 'customerNote') || undefined,
    };
    const fingerprint = JSON.stringify(body);
    if (pendingRequest.current?.fingerprint !== fingerprint) {
      pendingRequest.current = { fingerprint, key: returnIdempotencyKey() };
    }
    setMessage('');
    setErrorMessage('');
    try {
      const created = await createReturn({
        orderNumber: order.orderNumber,
        idempotencyKey: pendingRequest.current.key,
        body,
      }).unwrap();
      pendingRequest.current = undefined;
      setFormOpen(false);
      setMessage(`${created.returnNumber} was submitted for review.`);
      await query.refetch();
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'The request could not be submitted. Retrying it is safe.'),
      );
    }
  }

  async function cancel(returnNumber: string, expectedVersion: number) {
    setMessage('');
    setErrorMessage('');
    try {
      await cancelReturn({
        orderNumber: order.orderNumber,
        returnNumber,
        expectedVersion,
      }).unwrap();
      setMessage(`${returnNumber} was cancelled.`);
      await query.refetch();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'The request could not be cancelled.'));
    }
  }

  if (query.isLoading) {
    return <section className="order-section return-panel" aria-busy="true" />;
  }
  if (query.isError || !data) {
    return (
      <section className="order-section return-panel">
        <p className="eyebrow">Returns & exchanges</p>
        <p>Return information is temporarily unavailable.</p>
        <button className="text-button" type="button" onClick={() => void query.refetch()}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="order-section return-panel" aria-labelledby="returns-title">
      <div className="order-section__heading return-panel__heading">
        <div>
          <p className="eyebrow">Aftercare</p>
          <h2 id="returns-title">Returns & exchanges</h2>
        </div>
        {data.eligibility.eligible && !formOpen ? (
          <button className="button" type="button" onClick={() => setFormOpen(true)}>
            Start a request
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="auth-message auth-message--success" role="status">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="auth-message" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {data.eligibility.deadline ? (
        <p className="return-panel__policy">
          Request window closes {dateFormatter.format(new Date(data.eligibility.deadline))}.
          Exchange stock is confirmed only when the request is approved.
        </p>
      ) : (
        <p className="return-panel__policy">{data.eligibility.reason}</p>
      )}

      {formOpen ? (
        <form className="return-form" onSubmit={(event) => void submit(event)}>
          <fieldset className="return-form__type">
            <legend>What would you like?</legend>
            <label>
              <input
                type="radio"
                name="requestType"
                value="RETURN"
                checked={requestType === 'RETURN'}
                onChange={() => setRequestType('RETURN')}
              />
              Return for refund
            </label>
            <label>
              <input
                type="radio"
                name="requestType"
                value="EXCHANGE"
                checked={requestType === 'EXCHANGE'}
                onChange={() => setRequestType('EXCHANGE')}
              />
              Exchange variant
            </label>
          </fieldset>

          <div className="return-form__items">
            {data.eligibility.items
              .filter((item) => item.availableQuantity > 0)
              .map((item) => (
                <fieldset key={item.variantId}>
                  <legend>
                    {item.productName} · {item.variantTitle}
                  </legend>
                  <div className="return-form__fields">
                    <label>
                      <span>Quantity</span>
                      <select name={`quantity:${item.variantId}`} defaultValue="0">
                        <option value="0">Do not include</option>
                        {Array.from(
                          { length: item.availableQuantity },
                          (_, index) => index + 1,
                        ).map((quantity) => (
                          <option key={quantity} value={quantity}>
                            {quantity}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Reason</span>
                      <select name={`reason:${item.variantId}`} defaultValue="SIZE_ISSUE">
                        {reasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {requestType === 'EXCHANGE' ? (
                      <label>
                        <span>Replacement</span>
                        <select name={`exchange:${item.variantId}`} defaultValue="">
                          <option value="">Choose a variant</option>
                          {item.exchangeOptions.map((option) => (
                            <option
                              key={option.variantId}
                              value={option.variantId}
                              disabled={!option.currentlyAvailable}
                            >
                              {option.title} · {option.sku}
                              {option.currentlyAvailable ? '' : ' · unavailable'}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="return-form__detail">
                      <span>Details (optional)</span>
                      <input name={`detail:${item.variantId}`} maxLength={1000} />
                    </label>
                  </div>
                </fieldset>
              ))}
          </div>
          <label>
            <span>Anything else we should know? (optional)</span>
            <textarea name="customerNote" rows={3} maxLength={1000} />
          </label>
          <div className="return-form__actions">
            <button className="button button--dark" type="submit" disabled={createState.isLoading}>
              {createState.isLoading ? 'Submitting…' : 'Submit request'}
            </button>
            <button className="text-button" type="button" onClick={() => setFormOpen(false)}>
              Close
            </button>
          </div>
        </form>
      ) : null}

      {data.requests.length ? (
        <div className="return-request-list">
          {data.requests.map((request) => (
            <article key={request.returnNumber}>
              <header>
                <div>
                  <p className="eyebrow">{request.returnNumber}</p>
                  <h3>{request.type === 'RETURN' ? 'Return' : 'Exchange'}</h3>
                </div>
                <span className="admin-badge" data-status={request.status}>
                  {request.status}
                </span>
              </header>
              <ul>
                {request.items.map((item) => (
                  <li key={item.variantId}>
                    {item.productName} · {item.variantTitle} × {item.quantity}
                    {item.requestedExchangeVariant
                      ? ` → ${item.requestedExchangeVariant.title}`
                      : ''}
                  </li>
                ))}
              </ul>
              <p>Estimated item value: {formatPrice(request.estimatedTotalInPaise)}</p>
              {request.customerMessage ? <p>{request.customerMessage}</p> : null}
              {request.exchangeReservation ? (
                <p
                  className="exchange-reservation"
                  data-status={request.exchangeReservation.status}
                >
                  {request.exchangeReservation.status === 'ACTIVE'
                    ? `Replacement reserved${
                        request.exchangeReservation.expiresAt
                          ? ` until ${dateFormatter.format(
                              new Date(request.exchangeReservation.expiresAt),
                            )}`
                          : ''
                      }.`
                    : request.exchangeReservation.status === 'COMMITTED'
                      ? 'Replacement inventory committed for dispatch.'
                      : 'Replacement reservation expired and stock was released.'}
                </p>
              ) : null}
              {request.resolution?.trackingNumber ? (
                <p>
                  Replacement: {request.resolution.courierName} ·{' '}
                  {request.resolution.trackingUrl ? (
                    <a href={request.resolution.trackingUrl} rel="noreferrer" target="_blank">
                      {request.resolution.trackingNumber}
                    </a>
                  ) : (
                    request.resolution.trackingNumber
                  )}
                </p>
              ) : null}
              <CustomerReturnEvidence orderNumber={order.orderNumber} request={request} />
              {request.status === 'REQUESTED' ? (
                <button
                  className="text-button"
                  type="button"
                  disabled={cancelState.isLoading}
                  onClick={() => void cancel(request.returnNumber, request.version)}
                >
                  Cancel request
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
