import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateRepairBookingMutation, useRepairCatalogQuery } from './repair-api';
import {
  formatVisit,
  newBookingCredentials,
  repairError,
  repairPrice,
  saveBookingAccess,
  visitToIso,
} from './repair-utils';
import type { BookingInput, RepairBooking } from './repair.types';

function readPending(key: string): BookingInput | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as BookingInput | null;
    return value &&
      typeof value.idempotencyKey === 'string' &&
      /^[a-f0-9]{64}$/.test(value.manageToken)
      ? value
      : null;
  } catch {
    return null;
  }
}
function storePending(key: string, value: BookingInput | null) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch {
    /* In-memory retry state remains available. */
  }
}

export function BookingForm({
  admin = false,
  initialService = '',
}: {
  admin?: boolean;
  initialService?: string;
}) {
  const catalog = useRepairCatalogQuery();
  const [create, request] = useCreateRepairBookingMutation();
  const storageKey = `ifixer:pending-booking:${admin ? 'staff' : 'customer'}`;
  const [pending, setPending] = useState(() => readPending(storageKey));
  const [credentials, setCredentials] = useState(newBookingCredentials);
  const [customerName, setName] = useState(pending?.customerName ?? '');
  const [phone, setPhone] = useState(pending?.phone ?? '');
  const [email, setEmail] = useState(pending?.email ?? '');
  const [brandId, setBrand] = useState(pending?.brandId ?? '');
  const [modelId, setModel] = useState(pending?.modelId ?? '');
  const [chosenService, setService] = useState<string | undefined>(pending?.serviceId);
  const [deviceDescription, setDevice] = useState(pending?.deviceDescription ?? '');
  const [issue, setIssue] = useState(pending?.issue ?? '');
  const [visit, setVisit] = useState('');
  const [result, setResult] = useState<{ booking: RepairBooking; token: string }>();
  const [error, setError] = useState('');
  const data = catalog.data;
  const models = data?.models.filter((row) => row.brandId === brandId) ?? [];
  const services =
    data?.services.filter(
      (row) =>
        !modelId ||
        data.options.some((option) => option.modelId === modelId && option.serviceId === row.id),
    ) ?? [];
  const serviceId = chosenService ?? services.find((row) => row.slug === initialService)?.id ?? '';
  const option = data?.options.find(
    (row) => row.modelId === modelId && row.serviceId === serviceId,
  );

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const input = pending ?? {
      ...credentials,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      brandId: brandId || undefined,
      modelId: modelId || undefined,
      serviceId: serviceId || undefined,
      deviceDescription: modelId ? undefined : deviceDescription.trim(),
      issue: issue.trim(),
      requestedVisitAt: visitToIso(visit),
    };
    setPending(input);
    storePending(storageKey, input);
    try {
      const response = await create({ input, admin }).unwrap();
      saveBookingAccess(response.booking.reference, input.manageToken);
      setResult({ booking: response.booking, token: input.manageToken });
      setPending(null);
      storePending(storageKey, null);
    } catch (failure) {
      setError(repairError(failure));
      if (
        failure &&
        typeof failure === 'object' &&
        'status' in failure &&
        !pending &&
        typeof failure.status === 'number' &&
        failure.status >= 400 &&
        failure.status < 500
      ) {
        setPending(null);
        storePending(storageKey, null);
        setCredentials(newBookingCredentials());
      }
    }
  }

  if (result)
    return (
      <section className="repair-booking-result" aria-live="polite">
        <p className="repair-eyebrow">REQUEST RECEIVED</p>
        <h2>Your next step is on its way.</h2>
        <p>
          Booking reference <strong>{result.booking.reference}</strong>
        </p>
        <p>
          {result.booking.deviceLabel} · {result.booking.serviceLabel}
        </p>
        <p>
          Requested visit: {formatVisit(result.booking.requestedVisitAt)}. The shop still needs to
          confirm your appointment.
        </p>
        <p>
          Save your reference and private access code. They let you reopen, reschedule or cancel
          this booking in another browser. This tab remembers the code for this session.
        </p>
        <label className="repair-field">
          Private access code
          <input readOnly value={result.token} onFocus={(event) => event.currentTarget.select()} />
        </label>
        <Link
          className="repair-button"
          to={`${admin ? '/admin/repair/bookings' : '/book-repair'}/${result.booking.reference}`}
        >
          View booking <span aria-hidden="true">↗</span>
        </Link>
        {admin && (
          <button
            className="repair-secondary-button"
            onClick={() => {
              setResult(undefined);
              setName('');
              setPhone('');
              setEmail('');
              setIssue('');
              setDevice('');
              setVisit('');
              setCredentials(newBookingCredentials());
            }}
          >
            Record another walk-in
          </button>
        )}
      </section>
    );
  return (
    <form className="repair-booking-form" onSubmit={(event) => void submit(event)}>
      {catalog.isLoading && <p role="status">Loading repair options…</p>}
      {catalog.isError && (
        <p role="alert">
          Repair options could not load.{' '}
          <button type="button" className="repair-text-link" onClick={() => void catalog.refetch()}>
            Try again
          </button>
        </p>
      )}
      {pending && (
        <div className="repair-form-notice" role="status">
          A submission is awaiting confirmation. Retry below to check the same request without
          creating a duplicate.
          {pending.requestedVisitAt && (
            <p>Requested visit: {formatVisit(pending.requestedVisitAt)}</p>
          )}
        </div>
      )}
      <fieldset disabled={request.isLoading || Boolean(pending)}>
        <legend>01 / Your phone</legend>
        <div className="repair-fields-grid">
          <label className="repair-field">
            Brand
            <select
              value={brandId}
              onChange={(event) => {
                setBrand(event.target.value);
                setModel('');
                setService('');
              }}
            >
              <option value="">Other / not sure</option>
              {data?.brands.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="repair-field">
            Model
            <select
              value={modelId}
              onChange={(event) => {
                setModel(event.target.value);
                setService('');
              }}
            >
              <option value="">My model is not listed / not sure</option>
              {models.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!modelId && (
          <label className="repair-field">
            Describe your phone
            <input
              required
              minLength={2}
              maxLength={240}
              value={deviceDescription}
              onChange={(event) => setDevice(event.target.value)}
              placeholder="Any model name or details you know"
            />
          </label>
        )}
        <label className="repair-field">
          Repair service
          <select value={serviceId} onChange={(event) => setService(event.target.value)}>
            <option value="">Other issue / diagnosis</option>
            {services.map((row) => (
              <option value={row.id} key={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <p className="repair-price-note">
          {option?.pricingMode === 'INDICATIVE'
            ? `Indicative estimate: ${repairPrice(option.priceInPaise)}. Final charges need diagnosis and your approval.`
            : 'Diagnosis required. Repair options and any charges will be discussed after assessment.'}
        </p>
        <label className="repair-field">
          What’s happening with your phone?
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            placeholder="Tell us what stopped working and when it started."
          />
        </label>
      </fieldset>
      <fieldset disabled={request.isLoading || Boolean(pending)}>
        <legend>02 / Contact and visit</legend>
        <div className="repair-fields-grid">
          <label className="repair-field">
            Your name
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={customerName}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="repair-field">
            Phone with country code
            <input
              type="tel"
              autoComplete="tel"
              required
              pattern="\+?[1-9][0-9]{7,14}"
              maxLength={16}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="e.g. +91 followed by your number"
            />
          </label>
          <label className="repair-field">
            Email (optional)
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="repair-field">
            Preferred visit (optional, India time)
            <input
              type="datetime-local"
              value={visit}
              onChange={(event) => setVisit(event.target.value)}
            />
          </label>
        </div>
        <p className="repair-price-note">
          All visit times use India Standard Time (IST). A preferred time is a request; please wait
          for confirmation before visiting.
        </p>
      </fieldset>
      {error && (
        <p className="repair-form-error" role="alert">
          {error}
        </p>
      )}
      <p className="repair-price-note">
        Your details are used to handle this repair request. Do not include passwords, unlock codes
        or payment details.
      </p>
      <button
        className="repair-button"
        type="submit"
        disabled={request.isLoading || !data || catalog.isError}
      >
        {request.isLoading
          ? 'Sending request…'
          : pending
            ? 'Retry this request'
            : admin
              ? 'Record walk-in request'
              : 'Request a repair'}{' '}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
