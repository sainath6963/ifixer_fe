import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { useAppSelector } from '@/app/hooks';
import { useRepairJobsQuery } from '@/features/repair-jobs/job-api';
import { jobLabel, jobStatuses } from '@/features/repair-jobs/job.types';
import { formatVisit, repairError } from '@/features/repair-bookings/repair-utils';

export function Component() {
  const roles = useAppSelector((state) => state.session.admin?.roles ?? []);
  const manage = roles.some((role) => ['OWNER', 'STAFF', 'RECEPTION'].includes(role));
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = useRepairJobsQuery({
    page,
    status: params.get('status') || undefined,
    custody: params.get('custody') || undefined,
    search: params.get('search') || undefined,
  });
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }
  return (
    <section className="admin-page repair-jobs-page">
      <PageMeta
        noIndex
        title="Repair jobs"
        description="Device intake, repair progress and handover."
      />
      <header className="repair-job-heading">
        <div>
          <p className="repair-eyebrow">WORKSHOP</p>
          <h1>{manage ? 'Repair jobs' : 'My repair jobs'}</h1>
          <p>
            {manage
              ? 'Every device, from intake to handover.'
              : 'Your assigned devices and repair work.'}
          </p>
        </div>
        {manage && (
          <Link className="repair-button" to="/admin/repair/jobs/new">
            Receive a device
          </Link>
        )}
      </header>
      <form
        className="repair-job-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get('search');
          filter('search', typeof value === 'string' ? value.trim() : '');
        }}
      >
        <label className="repair-field">
          Search jobs
          <input
            name="search"
            key={params.get('search')}
            defaultValue={params.get('search') ?? ''}
            maxLength={100}
            placeholder="Job, customer or device"
          />
        </label>
        <label className="repair-field">
          Repair status
          <select
            value={params.get('status') ?? ''}
            onChange={(event) => filter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {jobStatuses.map((status) => (
              <option key={status} value={status}>
                {jobLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="repair-field">
          Device custody
          <select
            value={params.get('custody') ?? ''}
            onChange={(event) => filter('custody', event.target.value)}
          >
            <option value="">All devices</option>
            <option value="IN_SHOP">Still in shop</option>
            <option value="RETURNED">Returned to customer</option>
          </select>
        </label>
        <button className="repair-button">Search</button>
      </form>
      {query.isFetching && <p role="status">Loading jobs…</p>}
      {query.isError && (
        <p role="alert">
          {repairError(query.error)} <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {query.data && !query.isError && (
        <>
          <p>
            {query.data.total} job{query.data.total === 1 ? '' : 's'}
          </p>
          <div className="repair-job-list">
            {query.data.items.map((job) => (
              <Link
                className="repair-job-card"
                to={`/admin/repair/jobs/${job.number}`}
                key={job.number}
              >
                <div className="repair-job-card__top">
                  <span className="repair-job-number">{job.number}</span>
                  <span className="repair-status">{jobLabel(job.status)}</span>
                </div>
                <h2>{job.deviceLabel}</h2>
                <p>{job.customerName}</p>
                <p>{job.issue}</p>
                <dl>
                  <div>
                    <dt>Technician</dt>
                    <dd>{job.technicianName ?? 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>{job.targetAt ? formatVisit(job.targetAt) : 'Not set'}</dd>
                  </div>
                  <div>
                    <dt>Custody</dt>
                    <dd>{job.custody === 'IN_SHOP' ? 'Device in shop' : 'Returned'}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
          {!query.data.items.length && (
            <p className="repair-form-notice">No jobs match these filters.</p>
          )}
          <div className="repair-job-actions">
            <button
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(page - 1));
                setParams(next);
              }}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, query.data.totalPages)}
            </span>
            <button
              disabled={page >= query.data.totalPages}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(page + 1));
                setParams(next);
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
