import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { RepairJob } from '@/features/repair-jobs/job.types';
import { paiseToRupees, rupeesToPaise } from '@/features/admin/admin-form-utils';
import { formatVisit } from '@/features/repair-bookings/repair-utils';
import {
  StockActions,
  StockForm,
  Input,
  Reason,
  QueryState,
} from '@/features/repair-inventory/inventory-ui';
import { field, amount, money } from '@/features/repair-inventory/inventory-utils';
import { useBillingSettingsQuery, useJobBillingQuery } from './billing-api';
import type { BillingSettings, JobBilling, InvoiceLine } from './billing.types';
import { previewInvoice } from './billing-utils';
export function JobBillingPanel({ job }: { job: RepairJob }) {
  const query = useJobBillingQuery(job.number);
  const settings = useBillingSettingsQuery();
  const bill = query.data;
  return (
    <section className="repair-job-panel stock-page billing-page">
      <h2>Billing & warranty</h2>
      <QueryState query={query} />
      <QueryState query={settings} />
      <StockActions mode="billing" scope={`job:${job.number}`}>
        {bill && !query.isError && (
          <>
            <BillingTotals bill={bill} />
            {bill.invoice && (
              <>
                <div className="repair-form-notice">
                  <strong>
                    Invoice {bill.invoice.number} · {money(bill.invoice.totalInPaise)}
                  </strong>
                  <p>
                    Issued {formatVisit(bill.invoice.issuedAt)}. Prices and terms are fixed on this
                    invoice.
                  </p>
                  <Link to={`/admin/repair/jobs/${job.number}/billing/print`}>
                    Print / save invoice PDF
                  </Link>
                </div>
                <WarrantyPanel job={job} bill={bill} />
              </>
            )}
            {settings.data?.configured && !settings.isError ? (
              <>
                {!bill.invoice &&
                  job.estimates.at(-1)?.approval?.decision === 'APPROVED' &&
                  job.status !== 'DELIVERED' && (
                    <InvoiceEditor
                      key={`${settings.data.version}:${job.estimates.at(-1)?.revision}`}
                      job={job}
                      bill={bill}
                      settings={settings.data}
                    />
                  )}
                {!bill.invoice && job.estimates.at(-1)?.approval?.decision !== 'APPROVED' && (
                  <p>
                    An invoice requires approval of the latest estimate. Advances can be recorded
                    before approval.
                  </p>
                )}
                {(bill.invoice
                  ? bill.summary.dueInPaise > 0
                  : !['CANCELLED', 'UNREPAIRABLE', 'DELIVERED'].includes(job.status)) && (
                  <PaymentForm bill={bill} />
                )}
                {bill.permissions.owner && <OwnerActions bill={bill} job={job} />}
              </>
            ) : (
              <p className="repair-form-notice">
                Configure <Link to="/admin/repair/billing">shop billing settings</Link> before
                recording money or issuing an invoice.
              </p>
            )}
            {bill.deliveryAuthorization && (
              <p className="repair-form-notice">
                Delivery with {money(bill.deliveryAuthorization.dueInPaise)} due authorized by{' '}
                {bill.deliveryAuthorization.authorizedByName}. {bill.deliveryAuthorization.reason}
              </p>
            )}
            <h3>Payment receipts, refunds & credit notes</h3>
            <p>
              Cash and UPI entries are staff-recorded confirmations. Record them after checking the
              actual transfer or cash exchange. Refund entries record money returned; credit notes
              reduce invoice charges.
            </p>
            {!bill.entries.length && <p>No financial entries yet.</p>}
            <div className="stock-card-grid">
              {bill.entries.map((entry) => (
                <article className="stock-card" key={entry.id}>
                  <header>
                    <strong>{entry.number}</strong>
                    <span className="repair-status">{entry.kind}</span>
                  </header>
                  <h3>{money(entry.amountInPaise)}</h3>
                  <p>
                    {entry.method ?? 'Invoice charge reduction'}{' '}
                    {entry.reference && `· ${entry.reference}`}
                  </p>
                  <p>{entry.reason}</p>
                  <small>
                    {formatVisit(entry.recordedAt)} · {entry.recordedByName}
                  </small>
                  <p>
                    <Link to={`/admin/repair/jobs/${job.number}/billing/print?receipt=${entry.id}`}>
                      Print / save {entry.kind === 'CREDIT' ? 'credit note' : 'receipt'} PDF
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </StockActions>
    </section>
  );
}
function BillingTotals({ bill }: { bill: JobBilling }) {
  const summary = bill.summary;
  return (
    <dl className="billing-totals">
      {[
        [
          bill.invoice ? 'Invoice total' : 'Advance held',
          bill.invoice?.totalInPaise ?? summary.advanceInPaise,
        ],
        ['Net received', summary.netPaidInPaise],
        ['Credits issued', summary.creditedInPaise],
        ['Balance due', summary.dueInPaise],
        ['Refund due', summary.refundDueInPaise],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{money(Number(value))}</dd>
        </div>
      ))}
    </dl>
  );
}
function InvoiceEditor({
  job,
  bill,
  settings,
}: {
  job: RepairJob;
  bill: JobBilling;
  settings: BillingSettings;
}) {
  const owner = useAppSelector((s) => s.session.admin?.roles.includes('OWNER'));
  const [lines, setLines] = useState<
    Array<{
      key: number;
      kind: InvoiceLine['kind'];
      description: string;
      quantity: string;
      price: string;
    }>
  >(() =>
    job.estimates.at(-1)!.lines.map((line, key) => ({
      key,
      kind: 'SERVICE',
      description: line.description,
      quantity: String(line.quantity),
      price: paiseToRupees(line.unitPriceInPaise),
    })),
  );
  const [next, setNext] = useState(lines.length);
  const [discount, setDiscount] = useState('0');
  const [applyTax, setApplyTax] = useState((settings.taxes?.length ?? 0) > 0);
  const [days, setDays] = useState(String(settings.warrantyDays ?? ''));
  const [coverage, setCoverage] = useState(settings.warrantyCoverage ?? '');
  const [exclusions, setExclusions] = useState(settings.warrantyExclusions ?? '');
  const values = lines.map((line) => ({
    kind: line.kind,
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unitPriceInPaise: rupeesToPaise(line.price) ?? NaN,
  }));
  const totals = previewInvoice(
    values,
    rupeesToPaise(discount) ?? NaN,
    applyTax ? (settings.taxes ?? []) : [],
  );
  const approved = job.estimates.at(-1)!;
  return (
    <StockForm
      title="Issue repair invoice"
      button="Issue immutable invoice"
      submit={(data) => {
        if (!totals.valid) throw new Error('Check amounts, quantities and discount.');
        if (totals.total > approved.totalInPaise)
          throw new Error(
            'Final total exceeds the approved estimate. Obtain approval of a revised estimate first.',
          );
        return {
          path: `jobs/${job.number}/billing/invoice`,
          method: 'POST',
          body: {
            expectedJobVersion: bill.jobVersion,
            expectedSettingsVersion: settings.version,
            estimateRevision: approved.revision,
            lines: values,
            discountInPaise: totals.discount,
            applyTax,
            expectedTotalInPaise: totals.total,
            warrantyDays: Number(days),
            warrantyCoverage: coverage.trim(),
            warrantyExclusions: exclusions.trim(),
            reason: field(data, 'reason'),
          },
        };
      }}
    >
      <p>
        Latest approved estimate: {money(approved.totalInPaise)}. The final total, including
        configured taxes, must fit this approval.
      </p>
      {lines.map((line, index) => (
        <div className="stock-purchase-line" key={line.key}>
          <h4>Invoice line {index + 1}</h4>
          <label className="repair-field">
            Line type
            <select
              value={line.kind}
              onChange={(e) =>
                setLines(
                  lines.map((item) =>
                    item.key === line.key
                      ? { ...item, kind: e.target.value as InvoiceLine['kind'] }
                      : item,
                  ),
                )
              }
            >
              <option value="PART">Part</option>
              <option value="LABOUR">Labour</option>
              <option value="SERVICE">Service</option>
            </select>
          </label>
          {(['description', 'quantity', 'price'] as const).map((key) => (
            <label className="repair-field" key={key}>
              {key === 'price' ? `Unit price ₹ · line ${index + 1}` : `${key} · line ${index + 1}`}
              <input
                value={line[key]}
                required
                type={key === 'description' ? 'text' : 'number'}
                min={key === 'quantity' ? 1 : 0}
                max={key === 'quantity' ? 100 : 10000000}
                step={key === 'price' ? '0.01' : 1}
                maxLength={160}
                onChange={(e) =>
                  setLines(
                    lines.map((item) =>
                      item.key === line.key ? { ...item, [key]: e.target.value } : item,
                    ),
                  )
                }
              />
            </label>
          ))}
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => setLines(lines.filter((item) => item.key !== line.key))}
            >
              Remove line {index + 1}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={lines.length >= 30}
        onClick={() => {
          setLines([
            ...lines,
            { key: next, kind: 'SERVICE', description: '', quantity: '1', price: '' },
          ]);
          setNext(next + 1);
        }}
      >
        Add invoice line
      </button>
      <label className="repair-field">
        Discount ₹
        <input
          required
          type="number"
          min={0}
          max={10000000}
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </label>
      <label className="repair-job-checkbox">
        <input
          type="checkbox"
          checked={applyTax}
          disabled={!owner}
          onChange={(e) => setApplyTax(e.target.checked)}
        />{' '}
        Apply configured taxes
      </label>
      <div className="repair-form-notice" aria-live="polite">
        {totals.valid ? (
          <>
            <p>
              Subtotal {money(totals.subtotal)} · Discount {money(totals.discount)}
            </p>
            {totals.taxes.map((tax) => (
              <p key={tax.label}>
                {tax.label} ({tax.rateBps / 100}%): {money(tax.amountInPaise)}
              </p>
            ))}
            <strong>Invoice total {money(totals.total)}</strong>
            <p>
              Net advance applied {money(Math.min(totals.total, bill.summary.netPaidInPaise))} ·
              Balance {money(Math.max(0, totals.total - bill.summary.netPaidInPaise))}
            </p>
            {bill.summary.netPaidInPaise > totals.total && (
              <p>Customer refund due {money(bill.summary.netPaidInPaise - totals.total)}</p>
            )}
          </>
        ) : (
          'Enter valid amounts to preview the invoice.'
        )}
      </div>
      <h4>Warranty on this invoice</h4>
      <label className="repair-field">
        Warranty days
        <input
          required
          type="number"
          min={0}
          max={1095}
          value={days}
          readOnly={!owner}
          onChange={(e) => setDays(e.target.value)}
        />
      </label>
      <label className="repair-field">
        Warranty coverage
        <textarea
          required
          minLength={3}
          maxLength={2000}
          value={coverage}
          readOnly={!owner}
          onChange={(e) => setCoverage(e.target.value)}
        />
      </label>
      <label className="repair-field">
        Warranty exclusions / conditions
        <textarea
          required
          minLength={3}
          maxLength={2000}
          value={exclusions}
          readOnly={!owner}
          onChange={(e) => setExclusions(e.target.value)}
        />
      </label>
      <Reason label="Invoice issue note (internal)" />
      <label className="repair-job-checkbox">
        <input type="checkbox" required /> I checked the customer, lines, final total, taxes and
        warranty. Issued details cannot be edited.
      </label>
    </StockForm>
  );
}
function MethodFields() {
  const [method, setMethod] = useState('CASH');
  return (
    <>
      <label className="repair-field">
        Payment method
        <select name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI · checked manually</option>
        </select>
      </label>
      <Input
        label="Transaction reference"
        name="reference"
        required={method === 'UPI'}
        maxLength={100}
      />
      <Reason label="Receipt note (shown to customer)" />
      <label className="repair-job-checkbox">
        <input type="checkbox" required /> I verified that this money was actually received or
        returned.
      </label>
    </>
  );
}
function PaymentForm({ bill }: { bill: JobBilling }) {
  return (
    <StockForm
      title={bill.invoice ? 'Record payment' : 'Record advance'}
      button="Record received payment"
      submit={(data) => ({
        path: `jobs/${bill.jobNumber}/billing/payments`,
        method: 'POST',
        body: {
          expectedJobVersion: bill.jobVersion,
          amountInPaise: amount(data, 'amount'),
          method: field(data, 'method'),
          reference: field(data, 'reference') || undefined,
          reason: field(data, 'reason'),
        },
      })}
    >
      <Input
        label="Amount received ₹"
        name="amount"
        type="number"
        min={0.01}
        max={
          (bill.invoice ? bill.summary.dueInPaise : 1000000000 - bill.summary.netPaidInPaise) / 100
        }
        step="0.01"
      />
      <MethodFields />
    </StockForm>
  );
}
function OwnerActions({ bill, job }: { bill: JobBilling; job: RepairJob }) {
  const refundable = bill.entries
    .filter((entry) => entry.kind === 'PAYMENT')
    .map((entry) => ({
      ...entry,
      remaining:
        entry.amountInPaise -
        bill.entries
          .filter((refund) => refund.kind === 'REFUND' && refund.paymentId === entry.id)
          .reduce((sum, refund) => sum + refund.amountInPaise, 0),
    }))
    .filter((entry) => entry.remaining > 0);
  return (
    <div className="repair-job-form-grid">
      {bill.invoice && bill.summary.chargeInPaise > 0 && (
        <details className="stock-disclosure">
          <summary>Reduce charges with a credit note</summary>
          <StockForm
            title="Issue credit note"
            button="Issue credit note"
            submit={(data) => ({
              path: `jobs/${job.number}/billing/credits`,
              method: 'POST',
              body: {
                expectedJobVersion: bill.jobVersion,
                amountInPaise: amount(data, 'amount'),
                reason: field(data, 'reason'),
              },
            })}
          >
            <p>
              This reduces the amount charged, without changing the original invoice or moving
              money. If the customer overpaid, record the actual refund separately.
            </p>
            <Input
              label="Charge reduction ₹"
              name="amount"
              type="number"
              min={0.01}
              max={bill.summary.chargeInPaise / 100}
              step="0.01"
            />
            <Reason label="Credit reason (shown to customer)" />
          </StockForm>
        </details>
      )}
      {refundable.length > 0 && (
        <details className="stock-disclosure">
          <summary>Record money returned</summary>
          <StockForm
            title="Record refund"
            button="Record paid refund"
            submit={(data) => ({
              path: `jobs/${job.number}/billing/refunds`,
              method: 'POST',
              body: {
                expectedJobVersion: bill.jobVersion,
                paymentId: field(data, 'paymentId'),
                amountInPaise: amount(data, 'amount'),
                method: field(data, 'method'),
                reference: field(data, 'reference') || undefined,
                reason: field(data, 'reason'),
              },
            })}
          >
            <p>
              Refund only after returning the money. A refund alone does not reduce invoice charges;
              use a credit note when waiving a charge.
            </p>
            <label className="repair-field">
              Original payment
              <select name="paymentId" required>
                <option value="">Choose payment</option>
                {refundable.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.number} · up to {money(entry.remaining)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Amount returned ₹"
              name="amount"
              type="number"
              min={0.01}
              max={10000000}
              step="0.01"
            />
            <MethodFields />
          </StockForm>
        </details>
      )}
      {bill.invoice && bill.summary.dueInPaise > 0 && job.custody === 'IN_SHOP' && (
        <StockForm
          title="Owner delivery authorization"
          button={
            bill.deliveryAuthorization
              ? 'Revoke balance authorization'
              : 'Authorize delivery with balance due'
          }
          submit={(data) => ({
            path: `jobs/${job.number}/billing/delivery-authorization`,
            method: 'POST',
            body: {
              expectedJobVersion: bill.jobVersion,
              allow: !bill.deliveryAuthorization,
              expectedDueInPaise: bill.summary.dueInPaise,
              reason: field(data, 'reason'),
            },
          })}
        >
          <p>
            Balance due: {money(bill.summary.dueInPaise)}. Payment, refund or credit changes clear
            this authorization.
          </p>
          <Reason />
          <label className="repair-job-checkbox">
            <input type="checkbox" required /> I confirm this owner decision.
          </label>
        </StockForm>
      )}
    </div>
  );
}
function WarrantyPanel({ job, bill }: { job: RepairJob; bill: JobBilling }) {
  const invoice = bill.invoice!;
  return (
    <div className="billing-warranty">
      <h3>Repair warranty · {invoice.warrantyDays} days</h3>
      <p>{invoice.warrantyCoverage}</p>
      <p>{invoice.warrantyExclusions}</p>
      <p>
        {bill.warranty?.startsAt
          ? `${bill.warranty.active ? 'Within warranty dates' : 'Outside warranty dates'} · ${formatVisit(bill.warranty.startsAt)} to ${formatVisit(bill.warranty.endsAt)}`
          : 'Warranty dates begin when delivery is recorded.'}
      </p>
      {job.status === 'DELIVERED' && (
        <details className="stock-disclosure">
          <summary>Receive a warranty follow-up</summary>
          <StockForm
            title="Warranty follow-up intake"
            button="Create linked follow-up job"
            submit={(data) => ({
              path: `jobs/${job.number}/billing/followups`,
              method: 'POST',
              body: {
                expectedJobVersion: bill.jobVersion,
                issue: field(data, 'issue'),
                condition: field(data, 'condition'),
                accessories: field(data, 'accessories'),
              },
            })}
          >
            <p>
              The customer and device are copied from this repair. Inspect the device and decide
              coverage separately; linking a visit does not approve free work, including outside the
              warranty dates.
            </p>
            <label className="repair-field">
              Follow-up issue
              <textarea name="issue" required minLength={10} maxLength={2000} />
            </label>
            <Input label="Received condition" name="condition" maxLength={2000} />
            <Input label="Accessories received" name="accessories" maxLength={1000} />
          </StockForm>
        </details>
      )}
      {bill.followups.map((child) => (
        <p key={child.number}>
          <Link to={`/admin/repair/jobs/${child.number}`}>Follow-up {child.number}</Link> ·{' '}
          {child.status}
        </p>
      ))}
    </div>
  );
}
