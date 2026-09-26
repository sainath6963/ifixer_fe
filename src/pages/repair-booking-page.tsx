import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import {
  useChangeRepairBookingMutation,
  useRepairBookingQuery,
} from '@/features/repair-bookings/repair-api';
import {
  formatVisit,
  readBookingAccess,
  repairError,
  repairPrice,
  saveBookingAccess,
  visitToIso,
} from '@/features/repair-bookings/repair-utils';
import type { BookingChange } from '@/features/repair-bookings/repair.types';

export function Component() {
  const { reference = '' } = useParams();
  const admin = useLocation().pathname.startsWith('/admin/');
  return <BookingDetails key={`${admin}:${reference}`} reference={reference} admin={admin} />;
}
function BookingDetails({ reference, admin }: { reference: string; admin: boolean }) {
  const [token, setToken] = useState(() => readBookingAccess(reference));
  const [accessInput, setAccessInput] = useState(token);
  const query = useRepairBookingQuery(
    { reference, token: token || undefined, admin },
    { refetchOnMountOrArgChange: true },
  );
  const [change, mutation] = useChangeRepairBookingMutation();
  const [action, setAction] = useState<BookingChange['action']>(admin ? 'CONFIRM' : 'RESCHEDULE');
  const [visit, setVisit] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const booking = query.data?.booking;
  const closed = booking?.status === 'CANCELLED' || booking?.status === 'CONVERTED';
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;
    setError('');
    setMessage('');
    try {
      await change({
        reference,
        token: token || undefined,
        admin,
        input: {
          action,
          expectedVersion: booking.version,
          reason: reason.trim(),
          visitAt: action === 'CANCEL' ? undefined : visitToIso(visit),
        },
      }).unwrap();
      setMessage('Booking updated.');
      setReason('');
    } catch (failure) {
      setError(repairError(failure));
      void query.refetch();
    }
  }
  return (
    <section
      className={
        admin ? 'admin-page repair-booking-detail' : 'repair-section repair-booking-detail'
      }
    >
      <PageMeta
        noIndex
        title="Repair booking"
        description="Private repair booking details and visit management."
      />
      <p className="repair-eyebrow">{admin ? 'REPAIR BOOKINGS' : 'YOUR REPAIR REQUEST'}</p>
      <h1>Booking details</h1>
      <p className="repair-booking-reference">{reference}</p>
      {query.isLoading && <p role="status">Loading booking…</p>}
      {query.isError && (
        <div className="repair-form-notice">
          <p role="alert">{repairError(query.error)}</p>
          {!admin && (
            <form
              className="repair-access-form"
              onSubmit={(event) => {
                event.preventDefault();
                setToken(accessInput);
                saveBookingAccess(reference, accessInput);
                if (token === accessInput) void query.refetch();
              }}
            >
              <label className="repair-field">
                Private access code
                <input
                  required
                  pattern="[a-f0-9]{64}"
                  autoComplete="off"
                  value={accessInput}
                  onChange={(event) => setAccessInput(event.target.value.trim())}
                />
              </label>
              <button className="repair-button">Open my booking</button>
            </form>
          )}
          <button className="repair-text-link" onClick={() => void query.refetch()}>
            Refresh details
          </button>
        </div>
      )}
      {booking && !query.isError && (
        <>
          <div className="repair-booking-summary">
            <div>
              <span className="repair-status">{booking.status}</span>
              <h2>{booking.deviceLabel}</h2>
              <p>{booking.serviceLabel}</p>
              <p>{booking.issue}</p>
            </div>
            <dl>
              <div>
                <dt>Customer</dt>
                <dd>{booking.customerName}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {admin ? <a href={`tel:${booking.phone}`}>{booking.phone}</a> : booking.phone}
                </dd>
              </div>
              {booking.email && (
                <div>
                  <dt>Email</dt>
                  <dd>{booking.email}</dd>
                </div>
              )}
              <div>
                <dt>Requested visit</dt>
                <dd>{formatVisit(booking.requestedVisitAt)}</dd>
              </div>
              <div>
                <dt>Confirmed visit</dt>
                <dd>
                  {booking.confirmedVisitAt
                    ? formatVisit(booking.confirmedVisitAt)
                    : 'Awaiting confirmation'}
                </dd>
              </div>
              <div>
                <dt>Indicative cost</dt>
                <dd>
                  {repairPrice(booking.indicativePriceInPaise)}
                  {booking.indicativePriceInPaise !== undefined && ' · subject to diagnosis'}
                </dd>
              </div>
              {admin && (
                <div>
                  <dt>Source</dt>
                  <dd>{booking.source}</dd>
                </div>
              )}
            </dl>
          </div>
          {admin && booking.jobNumber && (
            <Link className="repair-button" to={`/admin/repair/jobs/${booking.jobNumber}`}>
              Open job card
            </Link>
          )}
          {admin && !closed && (
            <Link
              className="repair-button"
              to={`/admin/repair/jobs/new?booking=${booking.reference}`}
            >
              Receive device & open job card
            </Link>
          )}
          {!closed && (
            <form
              className="repair-booking-form repair-change-form"
              onSubmit={(event) => void submit(event)}
            >
              <h2>{admin ? 'Manage this visit' : 'Change your request'}</h2>
              <p>
                {admin
                  ? 'The reason is visible to the customer. Confirm or reschedule only after agreeing the visit time.'
                  : 'Rescheduling sends a new time request to the shop for confirmation.'}
              </p>
              <fieldset disabled={mutation.isLoading || query.isFetching}>
                <legend>Visit update</legend>
                <label className="repair-field">
                  Action
                  <select
                    value={action}
                    onChange={(event) => setAction(event.target.value as BookingChange['action'])}
                  >
                    {admin && (
                      <option value="CONFIRM" disabled={booking.status !== 'REQUESTED'}>
                        Confirm visit
                      </option>
                    )}
                    <option value="RESCHEDULE">
                      {admin ? 'Reschedule confirmed visit' : 'Request a new visit time'}
                    </option>
                    <option value="CANCEL">Cancel booking</option>
                  </select>
                </label>
                {action !== 'CANCEL' && (
                  <label className="repair-field">
                    New visit time (IST)
                    <input
                      type="datetime-local"
                      required
                      value={visit}
                      onChange={(event) => setVisit(event.target.value)}
                    />
                  </label>
                )}
                <label className="repair-field">
                  Reason (visible to customer)
                  <textarea
                    required
                    minLength={3}
                    maxLength={500}
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              </fieldset>
              <button
                className="repair-button"
                disabled={
                  mutation.isLoading ||
                  query.isFetching ||
                  (action === 'CONFIRM' && booking.status !== 'REQUESTED')
                }
              >
                {mutation.isLoading
                  ? 'Saving…'
                  : action === 'CANCEL'
                    ? 'Cancel this booking'
                    : 'Save visit update'}
              </button>
            </form>
          )}
          {message && <p role="status">{message}</p>}
          {error && (
            <p className="repair-form-error" role="alert">
              {error}
            </p>
          )}
          <section className="repair-booking-history">
            <h2>Booking history</h2>
            <ol>
              {booking.history.map((event, index) => (
                <li key={`${event.at}:${index}`}>
                  <strong>{event.status}</strong>
                  <time>{formatVisit(event.at)}</time>
                  <p>{event.reason}</p>
                  {event.visitAt && <p>Visit: {formatVisit(event.visitAt)}</p>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      <Link className="repair-text-link" to={admin ? '/admin/repair/bookings' : '/services'}>
        {admin ? 'Back to bookings' : 'Explore repair services'}
      </Link>
    </section>
  );
}
