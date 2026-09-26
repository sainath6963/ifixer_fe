import { JobBillingPanel } from '@/features/repair-billing/job-billing-panel';
import { JobPartsPanel } from '@/features/repair-inventory/job-parts-panel';
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { environment } from '@/config/environment';
import { rupeesToPaise, paiseToRupees } from '@/features/admin/admin-form-utils';
import { formatVisit, repairError, repairPrice } from '@/features/repair-bookings/repair-utils';
import {
  useRepairJobQuery,
  useRepairTeamQuery,
  useUpdateRepairJobMutation,
} from '@/features/repair-jobs/job-api';
import {
  jobLabel,
  testKeys,
  type JobStatus,
  type RepairJob,
} from '@/features/repair-jobs/job.types';

type RunAction = (
  action: string,
  body: Record<string, unknown> | FormData,
  method?: 'POST' | 'PATCH' | 'DELETE',
) => Promise<boolean>;
const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
};
function JobForm({
  title,
  button,
  children,
  submit,
  busy,
}: {
  title: string;
  button: string;
  children: ReactNode;
  submit: (data: FormData) => Promise<boolean>;
  busy: boolean;
}) {
  return (
    <form
      className="repair-job-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        void submit(new FormData(form)).then((success) => {
          if (success) form.reset();
        });
      }}
    >
      <h3>{title}</h3>
      <fieldset disabled={busy}>
        <legend>{title}</legend>
        {children}
        <button className="repair-button" disabled={busy}>
          {busy ? 'Saving…' : button}
        </button>
      </fieldset>
    </form>
  );
}
function Reason() {
  return (
    <label className="repair-field">
      Reason / work performed
      <textarea name="reason" required minLength={3} maxLength={1000} rows={2} />
    </label>
  );
}

export function Component() {
  const { number = '' } = useParams();
  return <JobDetails key={number} number={number} />;
}
function JobDetails({ number }: { number: string }) {
  const query = useRepairJobQuery(number, { refetchOnMountOrArgChange: true });
  const [update, mutation] = useUpdateRepairJobMutation();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'billing' ? 'billing' : 'work');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const job = query.data;
  const busy = mutation.isLoading || query.isFetching;
  async function run(
    action: string,
    values: Record<string, unknown> | FormData,
    method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  ) {
    if (!job) return false;
    setError('');
    setNotice('');
    const body = values instanceof FormData ? values : { ...values, expectedVersion: job.version };
    if (body instanceof FormData) body.set('expectedVersion', String(job.version));
    try {
      await update({ number, action, body, method }).unwrap();
      setNotice('Job updated.');
      return true;
    } catch (failure) {
      setError(repairError(failure));
      void query.refetch();
      return false;
    }
  }
  return (
    <section className="admin-page repair-job-detail">
      <PageMeta
        noIndex
        title={`Job ${number}`}
        description="Private repair job card and workshop history."
      />
      <div className="no-print">
        <Link className="repair-text-link" to="/admin/repair/jobs">
          ← Repair jobs
        </Link>
        {query.isLoading && <p role="status">Loading job…</p>}
        {query.isError && (
          <p role="alert">
            {repairError(query.error)}{' '}
            <button onClick={() => void query.refetch()}>Refresh job</button>
          </p>
        )}
        {job && !query.isError && (
          <>
            <header className="repair-job-heading">
              <div>
                <p className="repair-eyebrow">JOB CARD</p>
                <h1>{job.deviceLabel}</h1>
                <p className="repair-job-number">{job.number}</p>
              </div>
              {job.permissions.manage && (
                <button
                  className="repair-button repair-button--outline"
                  onClick={() => window.print()}
                >
                  Print job receipt
                </button>
              )}
            </header>
            <div className="repair-job-state">
              <span className="repair-status">{jobLabel(job.status)}</span>
              <strong>
                {job.custody === 'IN_SHOP'
                  ? 'Device still in shop'
                  : `Returned to ${job.returnedTo}`}
              </strong>
              <span>
                {job.technicianName ? `Technician: ${job.technicianName}` : 'Technician unassigned'}
              </span>
            </div>
            <dl className="repair-job-facts">
              <div>
                <dt>Customer</dt>
                <dd>
                  {job.customerName}
                  {job.phone && (
                    <>
                      <br />
                      <a href={`tel:${job.phone}`}>{job.phone}</a>
                    </>
                  )}
                  {job.email && (
                    <>
                      <br />
                      {job.email}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{formatVisit(job.createdAt)}</dd>
              </div>
              <div>
                <dt>Target completion</dt>
                <dd>{job.targetAt ? formatVisit(job.targetAt) : 'Not set'}</dd>
              </div>
              <div>
                <dt>IMEI / serial</dt>
                <dd>
                  {job.imei ?? 'IMEI not recorded'}
                  <br />
                  {job.serial ?? 'Serial not recorded'}
                </dd>
              </div>
            </dl>
            <div className="repair-job-intake">
              <div>
                <h2>Reported issue</h2>
                <p>{job.issue}</p>
              </div>
              <div>
                <h2>Received condition</h2>
                <p>{job.condition}</p>
              </div>
              <div>
                <h2>Accessories</h2>
                <p>{job.accessories}</p>
              </div>
            </div>
            {job.bookingReference && job.permissions.manage && (
              <Link
                className="repair-text-link"
                to={`/admin/repair/bookings/${job.bookingReference}`}
              >
                Source booking: {job.bookingReference}
              </Link>
            )}
            {notice && (
              <p className="repair-form-notice" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="repair-form-error" role="alert">
                {error}
              </p>
            )}
            <nav className="repair-job-tabs" aria-label="Job sections">
              {[
                ['work', 'Work & status'],
                ['estimate', 'Estimates & approval'],
                ['parts', 'Parts & stock'],
                ...(job.permissions.manage ? [['billing', 'Billing & warranty']] : []),
                ['photos', 'Private photos'],
                ['history', 'History & notes'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-current={tab === id ? 'page' : undefined}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === 'work' && <WorkPanel job={job} run={run} busy={busy} />}
            {tab === 'estimate' && <EstimatePanel job={job} run={run} busy={busy} />}
            {job.warrantySourceJobNumber && (
              <p className="repair-form-notice">
                Warranty follow-up for {job.warrantySourceJobNumber} /{' '}
                {job.warrantySourceInvoiceNumber}. Coverage requires inspection.
              </p>
            )}
            {tab === 'billing' && job.permissions.manage && <JobBillingPanel job={job} />}
            {tab === 'parts' && <JobPartsPanel job={job} />}
            {tab === 'photos' && (
              <section className="repair-job-panel">
                <h2>Private intake photos</h2>
                <p>
                  Up to 8 JPEG, PNG, WebP or AVIF images, 10 MB each. Photos are resized and
                  metadata is removed. Only authorized staff with access to this job can view them.
                </p>
                <div className="repair-job-photos">
                  {job.photos.map((photo, index) => (
                    <figure key={photo.id}>
                      <a
                        href={`${environment.apiBaseUrl}${photo.url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`${environment.apiBaseUrl}${photo.url}`}
                          alt={`Intake photo ${index + 1} for ${job.deviceLabel}`}
                          width={photo.width}
                          height={photo.height}
                        />
                      </a>
                      <figcaption>{formatVisit(photo.createdAt)}</figcaption>
                      {!closed(job) && (
                        <button
                          disabled={busy}
                          onClick={() => void run(`photos/${photo.id}`, {}, 'DELETE')}
                        >
                          Remove photo {index + 1}
                        </button>
                      )}
                    </figure>
                  ))}
                </div>
                {!job.photos.length && <p>No intake photos yet.</p>}
                {!closed(job) && job.photos.length < 8 && (
                  <JobForm
                    title="Add a photo"
                    button="Upload private photo"
                    busy={busy}
                    submit={(data) => run('photos', data)}
                  >
                    <label className="repair-field">
                      Intake photo
                      <input
                        name="file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        capture="environment"
                        required
                      />
                    </label>
                  </JobForm>
                )}
              </section>
            )}
            {tab === 'history' && (
              <section className="repair-job-panel">
                <JobForm
                  title="Internal note"
                  button="Add internal note"
                  busy={busy}
                  submit={(data) => run('notes', { text: text(data, 'text') })}
                >
                  <p>Staff only. Do not store passwords or unlock codes.</p>
                  <label className="repair-field">
                    Note
                    <textarea name="text" required minLength={3} maxLength={2000} rows={3} />
                  </label>
                </JobForm>
                <h2>Job history</h2>
                <ol className="repair-job-history">
                  {[...job.history].reverse().map((event, index) => (
                    <li key={`${event.at}:${index}`}>
                      <strong>
                        {jobLabel(event.action)} · {jobLabel(event.status)}
                      </strong>
                      <p>{event.reason}</p>
                      <small>
                        {event.actorName} · {formatVisit(event.at)}
                      </small>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </div>
      {job?.permissions.manage && !query.isError && <Receipt job={job} />}
    </section>
  );
}
function closed(job: RepairJob) {
  return ['CANCELLED', 'UNREPAIRABLE', 'DELIVERED'].includes(job.status);
}
function WorkPanel({ job, run, busy }: { job: RepairJob; run: RunAction; busy: boolean }) {
  const team = useRepairTeamQuery(undefined, { skip: !job.permissions.manage });
  const graph: Partial<Record<JobStatus, JobStatus[]>> = {
    RECEIVED: ['DIAGNOSING'],
    DIAGNOSING: ['AWAITING_PARTS'],
    AWAITING_APPROVAL: ['AWAITING_PARTS', 'REPAIRING'],
    AWAITING_PARTS: ['DIAGNOSING', 'REPAIRING'],
    REPAIRING: ['AWAITING_PARTS', 'TESTING'],
    TESTING: ['REPAIRING', 'READY'],
    READY: ['DELIVERED', 'REPAIRING'],
  };
  const approved = job.estimates.at(-1)?.approval?.decision === 'APPROVED';
  const next = (graph[job.status] ?? []).filter(
    (status) =>
      (status === 'DELIVERED' ? job.permissions.manage : job.permissions.repair) &&
      (!['REPAIRING', 'TESTING', 'READY', 'DELIVERED'].includes(status) || approved) &&
      (status !== 'DIAGNOSING' || !job.estimates.length),
  );
  return (
    <section className="repair-job-panel">
      <div className="repair-job-form-grid">
        {job.permissions.manage && !closed(job) && (
          <JobForm
            title="Assign technician"
            button="Save assignment"
            busy={busy}
            submit={(data) =>
              run(
                'assignment',
                { technicianId: text(data, 'technicianId'), reason: text(data, 'reason') },
                'PATCH',
              )
            }
          >
            {team.isError && <p role="alert">{repairError(team.error)}</p>}
            <label className="repair-field">
              Technician
              <select name="technicianId" required defaultValue={job.technicianId ?? ''}>
                <option value="">Choose technician</option>
                {team.data
                  ?.filter(
                    (member) => member.status === 'ACTIVE' && member.roles.includes('TECHNICIAN'),
                  )
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </label>
            {!team.isLoading &&
              !team.data?.some(
                (member) => member.roles.includes('TECHNICIAN') && member.status === 'ACTIVE',
              ) && <p>An owner can add a technician from Repair team.</p>}
            <Reason />
          </JobForm>
        )}
        <div className="repair-job-form">
          <h3>Diagnosis</h3>
          <p>{job.diagnosis ?? 'No diagnosis recorded yet.'}</p>
          {job.permissions.repair && job.status === 'DIAGNOSING' && (
            <JobForm
              title="Record diagnosis"
              button="Save diagnosis"
              busy={busy}
              submit={(data) => run('diagnosis', { text: text(data, 'text') })}
            >
              <label className="repair-field">
                Diagnosis findings
                <textarea
                  name="text"
                  required
                  minLength={3}
                  maxLength={2000}
                  defaultValue={job.diagnosis}
                  rows={4}
                />
              </label>
            </JobForm>
          )}
          {job.status === 'RECEIVED' && <p>Start diagnosing to record findings.</p>}
        </div>
        {next.length > 0 && (
          <JobForm
            key={job.status}
            title="Update repair status"
            button="Update status"
            busy={busy}
            submit={(data) =>
              run('transitions', {
                status: text(data, 'status'),
                reason: text(data, 'reason'),
                recipient: text(data, 'recipient') || undefined,
              })
            }
          >
            <label className="repair-field">
              Next status
              <select name="status" required>
                {next.map((status) => (
                  <option key={status} value={status}>
                    {jobLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <Reason />
            {next.includes('DELIVERED') && (
              <label className="repair-field">
                Collected by (required for delivery)
                <input name="recipient" minLength={2} maxLength={120} />
              </label>
            )}
            <p>
              {job.status === 'TESTING'
                ? 'All tests must pass or have an explained not-applicable result before ready.'
                : 'Estimate changes require a fresh customer decision.'}
            </p>
          </JobForm>
        )}
        {job.permissions.manage && !closed(job) && (
          <JobForm
            title="Close repair without completion"
            button="Record repair outcome"
            busy={busy}
            submit={(data) =>
              run('transitions', { status: text(data, 'status'), reason: text(data, 'reason') })
            }
          >
            <label className="repair-field">
              Outcome
              <select name="status">
                <option value="CANCELLED">Cancelled</option>
                <option value="UNREPAIRABLE">Unrepairable</option>
              </select>
            </label>
            <Reason />
            <p>The device remains in shop custody until handover is recorded.</p>
          </JobForm>
        )}
        {job.permissions.manage &&
          ['CANCELLED', 'UNREPAIRABLE'].includes(job.status) &&
          job.custody === 'IN_SHOP' && (
            <JobForm
              title="Return device to customer"
              button="Record handover"
              busy={busy}
              submit={(data) =>
                run('handover', {
                  recipient: text(data, 'recipient'),
                  reason: text(data, 'reason'),
                })
              }
            >
              <label className="repair-field">
                Collected by
                <input name="recipient" required minLength={2} maxLength={120} />
              </label>
              <Reason />
            </JobForm>
          )}
      </div>
      {job.status === 'AWAITING_APPROVAL' && (
        <p className="repair-form-notice">
          {approved
            ? 'Latest estimate approved. Repair work can begin.'
            : 'Record the customer decision under Estimates & approval before repair work begins.'}
        </p>
      )}
      {job.returnedAt && (
        <p>
          Handed to {job.returnedTo} on {formatVisit(job.returnedAt)}.
        </p>
      )}
      {job.permissions.repair && job.status === 'TESTING' && (
        <JobForm
          title="Testing checklist"
          button="Save testing results"
          busy={busy}
          submit={(data) =>
            run('tests', {
              tests: testKeys.map((key) => ({
                key,
                result: text(data, key),
                notes: text(data, `${key}-notes`) || undefined,
              })),
            })
          }
        >
          <p>Check each function. Explain any failure or test that does not apply.</p>
          <div className="repair-test-grid">
            {testKeys.map((key) => (
              <div className="repair-test-row" key={key}>
                <label className="repair-field">
                  {key}
                  <select
                    name={key}
                    defaultValue={job.tests.find((test) => test.key === key)?.result ?? ''}
                    required
                  >
                    <option value="">Not tested</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                    <option value="NA">Not applicable</option>
                  </select>
                </label>
                <label className="repair-field">
                  {key} notes
                  <input
                    name={`${key}-notes`}
                    maxLength={500}
                    defaultValue={job.tests.find((test) => test.key === key)?.notes}
                    placeholder="Required for fail / not applicable"
                  />
                </label>
              </div>
            ))}
          </div>
        </JobForm>
      )}
      {job.tests.length > 0 && (
        <div className="repair-test-results">
          <h3>Latest test results</h3>
          {job.tests.map((test) => (
            <p key={test.key}>
              <strong>
                {test.key}: {test.result}
              </strong>
              {test.notes && ` · ${test.notes}`}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
function EstimatePanel({ job, run, busy }: { job: RepairJob; run: RunAction; busy: boolean }) {
  const latest = job.estimates.at(-1);
  return (
    <section className="repair-job-panel">
      <h2>Estimates & customer decisions</h2>
      <p>
        These are repair estimates, not invoices or payment receipts. Record approval only after
        speaking with the customer or receiving their message.
      </p>
      {job.billingInvoiceNumber && (
        <p className="repair-form-notice">
          Invoice {job.billingInvoiceNumber} is issued. Use Billing & warranty for payment records
          or credit notes.
        </p>
      )}
      {!latest && <p>No estimate yet. Record a diagnosis first.</p>}
      {[...job.estimates].reverse().map((estimate) => (
        <article className="repair-estimate" key={estimate.revision}>
          <header>
            <h3>
              Estimate {estimate.revision}
              {estimate.revision === latest?.revision ? ' · latest' : ''}
            </h3>
            <strong>{repairPrice(estimate.totalInPaise)}</strong>
          </header>
          <ul>
            {estimate.lines.map((line, index) => (
              <li key={index}>
                <span>
                  {line.description} × {line.quantity}
                </span>
                <span>{repairPrice(line.unitPriceInPaise * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p>{estimate.reason}</p>
          <small>{formatVisit(estimate.at)}</small>
          <p className="repair-form-notice">
            {estimate.approval
              ? `${estimate.approval.decision} · ${estimate.approval.customerName} · ${jobLabel(estimate.approval.method)} · ${formatVisit(estimate.approval.at)}`
              : estimate.revision === latest?.revision
                ? 'Awaiting customer decision'
                : 'Superseded without a decision'}
          </p>
          {estimate.approval && <p>{estimate.approval.evidence}</p>}
        </article>
      ))}
      {job.permissions.manage &&
        job.status === 'AWAITING_APPROVAL' &&
        latest &&
        !latest.approval && (
          <JobForm
            title={`Customer decision for estimate ${latest.revision}`}
            button="Record customer decision"
            busy={busy}
            submit={(data) =>
              run('approval', {
                revision: latest.revision,
                decision: text(data, 'decision'),
                method: text(data, 'method'),
                customerName: text(data, 'customerName'),
                evidence: text(data, 'evidence'),
              })
            }
          >
            <label className="repair-field">
              Decision
              <select name="decision">
                <option value="APPROVED">Customer approved</option>
                <option value="DECLINED">Customer declined</option>
              </select>
            </label>
            <label className="repair-field">
              How was the decision received?
              <select name="method">
                <option value="IN_PERSON">In person</option>
                <option value="PHONE">Phone call</option>
                <option value="MESSAGE">Customer message</option>
              </select>
            </label>
            <label className="repair-field">
              Customer / authorized person's name
              <input
                name="customerName"
                required
                minLength={2}
                maxLength={120}
                defaultValue={job.customerName}
              />
            </label>
            <label className="repair-field">
              Decision evidence / conversation details
              <textarea
                name="evidence"
                required
                minLength={5}
                maxLength={1000}
                placeholder="What was agreed, when, and any message reference"
              />
            </label>
            <label className="repair-job-checkbox">
              <input type="checkbox" required /> I received this decision for estimate{' '}
              {latest.revision}, total {repairPrice(latest.totalInPaise)}.
            </label>
          </JobForm>
        )}
      {job.permissions.manage && !closed(job) && job.diagnosis && !job.billingInvoiceNumber && (
        <EstimateEditor key={latest?.revision ?? 0} job={job} run={run} busy={busy} />
      )}
    </section>
  );
}
function EstimateEditor({ job, run, busy }: { job: RepairJob; run: RunAction; busy: boolean }) {
  const [lines, setLines] = useState(
    () =>
      job.estimates.at(-1)?.lines.map((line) => ({
        description: line.description,
        quantity: String(line.quantity),
        amount: paiseToRupees(line.unitPriceInPaise),
      })) ?? [{ description: '', quantity: '1', amount: '' }],
  );
  const [error, setError] = useState('');
  return (
    <JobForm
      title={job.estimates.length ? 'Create revised estimate' : 'Create estimate'}
      button="Save new estimate revision"
      busy={busy}
      submit={async (data) => {
        setError('');
        const values = lines.map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unitPriceInPaise: rupeesToPaise(line.amount),
        }));
        if (values.some((line) => line.unitPriceInPaise === undefined)) {
          setError('Use amounts in rupees with at most two decimal places.');
          return false;
        }
        return run('estimates', { lines: values, reason: text(data, 'reason') });
      }}
    >
      <p>
        Every revision pauses repair work for a fresh customer decision and clears earlier test
        results.
      </p>
      {lines.map((line, index) => (
        <div className="repair-estimate-line" key={index}>
          {(['description', 'quantity', 'amount'] as const).map((field) => (
            <label className="repair-field" key={field}>
              {field === 'amount'
                ? `Unit price ₹ · line ${index + 1}`
                : `${field} · line ${index + 1}`}
              <input
                required
                value={line[field]}
                type={field === 'quantity' ? 'number' : 'text'}
                inputMode={field === 'amount' ? 'decimal' : undefined}
                min={field === 'quantity' ? 1 : undefined}
                max={field === 'quantity' ? 100 : undefined}
                maxLength={field === 'description' ? 160 : 15}
                minLength={field === 'description' ? 2 : undefined}
                onChange={(event) =>
                  setLines(
                    lines.map((item, current) =>
                      current === index ? { ...item, [field]: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
          ))}
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => setLines(lines.filter((_, current) => current !== index))}
            >
              Remove line {index + 1}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={lines.length >= 30}
        onClick={() => setLines([...lines, { description: '', quantity: '1', amount: '' }])}
      >
        Add estimate line
      </button>
      <Reason />
      {error && <p role="alert">{error}</p>}
    </JobForm>
  );
}
function Receipt({ job }: { job: RepairJob }) {
  return (
    <article className="repair-job-receipt">
      <header>
        <strong>iFixer</strong>
        <h1>Device intake / job receipt</h1>
        <p>{job.number}</p>
      </header>
      <dl>
        <div>
          <dt>Received</dt>
          <dd>{formatVisit(job.createdAt)}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>
            {job.customerName} · {job.phone}
          </dd>
        </div>
        <div>
          <dt>Device</dt>
          <dd>{job.deviceLabel}</dd>
        </div>
        <div>
          <dt>IMEI / serial</dt>
          <dd>
            {job.imei ?? 'Not recorded'} / {job.serial ?? 'Not recorded'}
          </dd>
        </div>
        <div>
          <dt>Reported issue</dt>
          <dd>{job.issue}</dd>
        </div>
        <div>
          <dt>Received condition</dt>
          <dd>{job.condition}</dd>
        </div>
        <div>
          <dt>Accessories</dt>
          <dd>{job.accessories}</dd>
        </div>
        <div>
          <dt>Target completion</dt>
          <dd>{job.targetAt ? formatVisit(job.targetAt) : 'To be agreed'}</dd>
        </div>
        <div>
          <dt>Current status</dt>
          <dd>
            {jobLabel(job.status)} ·{' '}
            {job.custody === 'IN_SHOP'
              ? 'Device in shop'
              : `Returned to ${job.returnedTo} on ${formatVisit(job.returnedAt)}`}
          </dd>
        </div>
      </dl>
      <p>
        Keep this receipt for collection. Repair charges require an agreed estimate. This document
        is not a tax invoice or proof of payment.
      </p>
      <div className="repair-receipt-signatures">
        <span>Customer acknowledgement __________________</span>
        <span>Received by __________________</span>
      </div>
    </article>
  );
}
