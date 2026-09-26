import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { AdminPagination } from '@/features/admin/admin-pagination';
import { BookingForm } from '@/features/repair-bookings/booking-form';
import { useRepairBookingsQuery } from '@/features/repair-bookings/repair-api';
import { formatVisit, repairError } from '@/features/repair-bookings/repair-utils';
import type { BookingStatus } from '@/features/repair-bookings/repair.types';

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  const selectedStatus = params.get('status') ?? '';
  const status = ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'CONVERTED'].includes(selectedStatus)
    ? (selectedStatus as BookingStatus)
    : undefined;
  const search = params.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const query = useRepairBookingsQuery({ page, status, search: search || undefined });
  const [walkIn, setWalkIn] = useState(false);
  return (
    <section className="admin-page repair-bookings-admin">
      <PageMeta
        noIndex
        title="Repair bookings"
        description="Review repair requests, confirm visits and record walk-ins."
      />
      <header className="admin-page-header">
        <div>
          <p className="repair-eyebrow">REPAIR REQUESTS</p>
          <h1>
            Every phone.
            <br />A next step.
          </h1>
          <p>Review requests, agree visit times and keep customers informed.</p>
        </div>
        <button className="repair-button" aria-expanded={walkIn} onClick={() => setWalkIn(!walkIn)}>
          {walkIn ? 'Close walk-in form' : 'Add walk-in'}
        </button>
      </header>
      {walkIn && (
        <section className="repair-walk-in">
          <h2>Record a walk-in request</h2>
          <BookingForm admin />
        </section>
      )}
      <form
        className="repair-booking-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({
            ...(status ? { status } : {}),
            ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
          });
        }}
      >
        <label className="repair-field">
          Search bookings
          <input
            type="search"
            maxLength={100}
            placeholder="Reference, name, phone or device"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <label className="repair-field">
          Status
          <select
            value={status ?? ''}
            onChange={(event) =>
              setParams({
                ...(search ? { search } : {}),
                ...(event.target.value ? { status: event.target.value } : {}),
              })
            }
          >
            <option value="">All statuses</option>
            {['REQUESTED', 'CONFIRMED', 'CANCELLED', 'CONVERTED'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button className="repair-secondary-button">Search</button>
      </form>
      {query.isFetching && <p role="status">Loading bookings…</p>}
      {query.isError && (
        <p role="alert">
          {repairError(query.error)} <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {query.currentData && !query.isError && (
        <>
          <p className="repair-booking-count">{query.currentData.total} requests</p>
          <div className="repair-queue">
            {query.currentData.items.map((booking) => (
              <article className="repair-queue-card" key={booking.reference}>
                <div className="repair-queue-card__top">
                  <span className="repair-status">{booking.status}</span>
                  <span>{booking.source === 'WALK_IN' ? 'Walk-in' : 'Online'}</span>
                </div>
                <h2>
                  <Link to={`/admin/repair/bookings/${booking.reference}`}>
                    {booking.deviceLabel}
                  </Link>
                </h2>
                <p>
                  {booking.customerName} · {booking.phone}
                </p>
                <p>{booking.serviceLabel}</p>
                <dl>
                  <dt>{booking.confirmedVisitAt ? 'Confirmed visit' : 'Requested visit'}</dt>
                  <dd>{formatVisit(booking.confirmedVisitAt ?? booking.requestedVisitAt)}</dd>
                </dl>
                <Link
                  className="repair-text-link"
                  to={`/admin/repair/bookings/${booking.reference}`}
                >
                  Open {booking.reference} <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
          {!query.currentData.items.length && (
            <div className="repair-form-notice">
              No bookings match this view. New customer requests appear here after submission.
            </div>
          )}
          <AdminPagination
            {...query.currentData}
            disabled={query.isFetching}
            onPageChange={(value) =>
              setParams({
                ...(status ? { status } : {}),
                ...(search ? { search } : {}),
                page: String(value),
              })
            }
          />
        </>
      )}
    </section>
  );
}
