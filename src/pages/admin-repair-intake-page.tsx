import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { useAppSelector } from '@/app/hooks';
import { useRepairBookingQuery } from '@/features/repair-bookings/repair-api';
import { repairError, visitToIso } from '@/features/repair-bookings/repair-utils';
import { useCreateRepairJobMutation } from '@/features/repair-jobs/job-api';
import type { JobIntake } from '@/features/repair-jobs/job.types';

export function Component() {
  const [params] = useSearchParams();
  const reference = params.get('booking') ?? '';
  const adminId = useAppSelector((state) => state.session.admin?.id ?? '');
  return <Intake key={`${adminId}:${reference}`} reference={reference} adminId={adminId} />;
}
function Intake({ reference, adminId }: { reference: string; adminId: string }) {
  const navigate = useNavigate();
  const query = useRepairBookingQuery({ reference, admin: true }, { skip: !reference });
  const [create, mutation] = useCreateRepairJobMutation();
  const storageKey = `ifixer:intake:${adminId}:${reference || 'walk-in'}`;
  const [pending, setPending] = useState<JobIntake | undefined>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as JobIntake | undefined;
    } catch {
      return undefined;
    }
  });
  const [error, setError] = useState('');
  function clearPendingStorage() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage may be disabled; successful intake must still navigate. */
    }
  }
  async function send(input: JobIntake) {
    setError('');
    setPending(input);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(input));
    } catch {
      /* The in-memory request still retains its retry key. */
    }
    try {
      const job = await create(input).unwrap();
      clearPendingStorage();
      await navigate(`/admin/repair/jobs/${job.number}`, { replace: true });
    } catch (failure) {
      setError(repairError(failure));
      const status =
        failure && typeof failure === 'object' && 'status' in failure ? failure.status : undefined;
      if (
        !pending &&
        typeof status === 'number' &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429
      ) {
        setPending(undefined);
        clearPendingStorage();
        if (reference) void query.refetch();
      }
    }
  }
  const booking = query.data?.booking;
  return (
    <section className="admin-page repair-intake-page">
      <PageMeta
        noIndex
        title="Receive a device"
        description="Record a private repair intake and open a job card."
      />
      <p className="repair-eyebrow">DEVICE INTAKE</p>
      <h1>Receive a device</h1>
      <p>
        Record the condition together with the customer. Do not enter device passwords or unlock
        codes.
      </p>
      {reference && query.isLoading && <p role="status">Loading booking…</p>}
      {query.isError && <p role="alert">{repairError(query.error)}</p>}
      {booking && (
        <div className="repair-form-notice">
          <strong>
            {booking.reference} · {booking.customerName}
          </strong>
          <p>
            {booking.deviceLabel} · {booking.issue}
          </p>
          {booking.jobNumber && (
            <Link to={`/admin/repair/jobs/${booking.jobNumber}`}>Open existing job card</Link>
          )}
          {booking.status === 'CANCELLED' && <p>This booking is cancelled.</p>}
        </div>
      )}
      {(!reference ||
        (booking && !query.isError && ['REQUESTED', 'CONFIRMED'].includes(booking.status))) && (
        <form
          className="repair-booking-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) {
              void send(pending);
              return;
            }
            const data = new FormData(event.currentTarget);
            const text = (key: string) => {
              const value = data.get(key);
              return typeof value === 'string' ? value.trim() : '';
            };
            void send({
              idempotencyKey: crypto.randomUUID(),
              ...(booking
                ? { bookingReference: booking.reference, expectedBookingVersion: booking.version }
                : {
                    customerName: text('customerName'),
                    phone: text('phone'),
                    email: text('email') || undefined,
                    deviceLabel: text('deviceLabel'),
                    issue: text('issue'),
                  }),
              imei: text('imei') || undefined,
              serial: text('serial') || undefined,
              condition: text('condition'),
              accessories: text('accessories'),
              targetAt: text('targetAt') ? visitToIso(text('targetAt')) : undefined,
            });
          }}
        >
          <fieldset disabled={mutation.isLoading || Boolean(pending)}>
            <legend>{reference ? 'Booking intake' : 'Walk-in intake'}</legend>
            {!reference && (
              <>
                <label className="repair-field">
                  Customer name
                  <input
                    name="customerName"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    defaultValue={pending?.customerName}
                  />
                </label>
                <label className="repair-field">
                  Phone
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    pattern="\+?[1-9][0-9]{7,14}"
                    defaultValue={pending?.phone}
                  />
                </label>
                <label className="repair-field">
                  Email (optional)
                  <input name="email" type="email" maxLength={254} defaultValue={pending?.email} />
                </label>
                <label className="repair-field">
                  Device / model
                  <input
                    name="deviceLabel"
                    required
                    minLength={2}
                    maxLength={400}
                    defaultValue={pending?.deviceLabel}
                  />
                </label>
                <label className="repair-field">
                  Reported issue
                  <textarea
                    name="issue"
                    required
                    minLength={10}
                    maxLength={2000}
                    defaultValue={pending?.issue}
                  />
                </label>
              </>
            )}
            <label className="repair-field">
              IMEI (optional, 15 digits)
              <input
                name="imei"
                inputMode="numeric"
                pattern="[0-9]{15}"
                maxLength={15}
                defaultValue={pending?.imei}
              />
            </label>
            <label className="repair-field">
              Serial number (optional)
              <input name="serial" maxLength={120} defaultValue={pending?.serial} />
            </label>
            <label className="repair-field">
              Received condition
              <textarea
                name="condition"
                required
                minLength={3}
                maxLength={2000}
                placeholder="Cracks, marks, power state and existing damage"
                defaultValue={pending?.condition}
              />
            </label>
            <label className="repair-field">
              Accessories received
              <textarea
                name="accessories"
                required
                minLength={2}
                maxLength={1000}
                placeholder="Case, charger, SIM / memory card, or None"
                defaultValue={pending?.accessories}
              />
            </label>
            <label className="repair-field">
              Target completion (IST, optional)
              <input type="datetime-local" name="targetAt" />
            </label>
          </fieldset>
          {pending && (
            <p role="status">
              Intake is pending confirmation. Retry uses the same request and cannot create a second
              job.
            </p>
          )}
          <button className="repair-button" disabled={mutation.isLoading}>
            {mutation.isLoading
              ? 'Receiving…'
              : pending
                ? 'Retry this intake'
                : 'Receive device & create job'}
          </button>
        </form>
      )}
      {pending && booking?.jobNumber && (
        <button className="repair-button" onClick={() => void send(pending)}>
          Recover intake result
        </button>
      )}
      {error && (
        <p className="repair-form-error" role="alert">
          {error}
        </p>
      )}
      <Link className="repair-text-link" to="/admin/repair/jobs">
        Back to jobs
      </Link>
    </section>
  );
}
