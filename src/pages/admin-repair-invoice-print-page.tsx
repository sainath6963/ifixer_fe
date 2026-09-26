import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { useJobBillingQuery } from '@/features/repair-billing/billing-api';
import type { Invoice, Issuer, MoneyEntry } from '@/features/repair-billing/billing.types';
import { QueryState } from '@/features/repair-inventory/inventory-ui';
import { money } from '@/features/repair-inventory/inventory-utils';
import { formatVisit } from '@/features/repair-bookings/repair-utils';
export function Component() {
  const { number = '' } = useParams();
  const [params] = useSearchParams();
  const receiptId = params.get('receipt');
  const query = useJobBillingQuery(number);
  const bill = query.data;
  const receipt = bill?.entries.find((entry) => entry.id === receiptId);
  const visible = receiptId ? receipt : bill?.invoice;
  return (
    <section className="admin-page billing-print-page">
      <PageMeta
        noIndex
        title={visible?.number ?? 'Repair document'}
        description="Private repair invoice or receipt."
      />
      <div className="no-print">
        <Link className="repair-text-link" to={`/admin/repair/jobs/${number}?tab=billing`}>
          ← Job billing
        </Link>
        <QueryState query={query} />
        {bill && !query.isError && !visible && (
          <p role="alert">Requested invoice or receipt was not found.</p>
        )}
        {visible && !query.isError && (
          <div className="stock-toolbar">
            <button className="repair-button" onClick={() => window.print()}>
              Print / save PDF
            </button>
            <p>Choose Save as PDF in the print dialog to download this document.</p>
          </div>
        )}
      </div>
      {bill &&
        visible &&
        !query.isError &&
        (receipt ? (
          <PaymentDocument receipt={receipt} />
        ) : (
          bill.invoice && (
            <article className="billing-document">
              <InvoiceDocument invoice={bill.invoice} />
              <section className="billing-document-section">
                <h2>Repair warranty</h2>
                <p>
                  <strong>{bill.invoice.warrantyDays} days from delivery</strong>
                </p>
                <p>{bill.invoice.warrantyCoverage}</p>
                <p>Conditions: {bill.invoice.warrantyExclusions}</p>
                <p>
                  {bill.warranty?.startsAt
                    ? `Delivery / start: ${formatVisit(bill.warranty.startsAt)}. End: ${formatVisit(bill.warranty.endsAt)}.`
                    : 'Delivery has not been recorded; warranty dates are pending.'}
                </p>
              </section>
              <section className="billing-document-section">
                <h2>Current account summary</h2>
                <p>
                  As of {formatVisit(new Date().toISOString())}. Separate receipts record each
                  payment or refund.
                </p>
                <dl className="billing-document-totals">
                  <div>
                    <dt>Credits issued</dt>
                    <dd>{money(bill.summary.creditedInPaise)}</dd>
                  </div>
                  <div>
                    <dt>Payments received, less refunds</dt>
                    <dd>{money(bill.summary.netPaidInPaise)}</dd>
                  </div>
                  <div>
                    <dt>Balance due</dt>
                    <dd>{money(bill.summary.dueInPaise)}</dd>
                  </div>
                  {bill.summary.refundDueInPaise > 0 && (
                    <div>
                      <dt>Refund due to customer</dt>
                      <dd>{money(bill.summary.refundDueInPaise)}</dd>
                    </div>
                  )}
                </dl>
              </section>
              {bill.invoice.note && <p className="billing-document-note">{bill.invoice.note}</p>}
              <footer>Keep this invoice for future repair or warranty enquiries.</footer>
            </article>
          )
        ))}
    </section>
  );
}
function IssuerHeader({ issuer }: { issuer: Issuer }) {
  return (
    <header className="billing-issuer">
      <strong>{issuer.name}</strong>
      <p>{issuer.address}</p>
      <p>
        {issuer.phone}
        {issuer.taxId && ` · Tax registration: ${issuer.taxId}`}
      </p>
    </header>
  );
}
function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  return (
    <>
      <IssuerHeader issuer={invoice.issuer} />
      <div className="billing-document-title">
        <div>
          <h1>Repair invoice</h1>
          <strong>{invoice.number}</strong>
        </div>
        <p>{formatVisit(invoice.issuedAt)}</p>
      </div>
      <div className="billing-document-section">
        <p>
          <strong>{invoice.customerName}</strong> · {invoice.phone}
        </p>
        <p>
          {invoice.deviceLabel} · {invoice.jobNumber}
        </p>
        {(invoice.imei || invoice.serial) && (
          <p>
            IMEI / serial: {invoice.imei ?? '—'} / {invoice.serial ?? '—'}
          </p>
        )}
      </div>
      <table className="billing-lines">
        <colgroup>
          <col style={{ width: '45%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit price</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index}>
              <td>
                <small>{line.kind.toLowerCase()}</small>
                <br />
                {line.description}
              </td>
              <td>
                <span className="billing-mobile-label">Qty</span>
                <span>{line.quantity}</span>
              </td>
              <td>
                <span className="billing-mobile-label">Unit price</span>
                <span>{money(line.unitPriceInPaise)}</span>
              </td>
              <td>
                <span className="billing-mobile-label">Amount</span>
                <span>{money(line.quantity * line.unitPriceInPaise)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="billing-document-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(invoice.subtotalInPaise)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>{money(invoice.discountInPaise)}</dd>
        </div>
        {invoice.taxes.map((tax) => (
          <div key={tax.label}>
            <dt>
              {tax.label} ({tax.rateBps / 100}%)
            </dt>
            <dd>{money(tax.amountInPaise)}</dd>
          </div>
        ))}
        <div className="billing-grand-total">
          <dt>Invoice total</dt>
          <dd>{money(invoice.totalInPaise)}</dd>
        </div>
      </dl>
    </>
  );
}
function PaymentDocument({ receipt }: { receipt: MoneyEntry }) {
  return (
    <article className="billing-document">
      <IssuerHeader issuer={receipt.issuer} />
      <div className="billing-document-title">
        <div>
          <h1>
            {receipt.kind === 'PAYMENT'
              ? 'Payment receipt'
              : receipt.kind === 'REFUND'
                ? 'Refund receipt'
                : 'Credit note'}
          </h1>
          <strong>{receipt.number}</strong>
        </div>
        <p>{formatVisit(receipt.recordedAt)}</p>
      </div>
      <section className="billing-document-section">
        <p>
          <strong>{receipt.customerName}</strong>
        </p>
        <p>Job: {receipt.jobNumber}</p>
        {receipt.invoiceNumber && <p>Invoice: {receipt.invoiceNumber}</p>}
        {receipt.paymentNumber && <p>Original payment receipt: {receipt.paymentNumber}</p>}
        <h2>{money(receipt.amountInPaise)}</h2>
        <p>
          {receipt.kind === 'CREDIT'
            ? 'Invoice charge reduction; no cash transfer recorded on this document.'
            : `${receipt.method} · Staff-recorded ${receipt.kind === 'PAYMENT' ? 'payment received' : 'refund paid'}.`}
        </p>
        {receipt.reference && <p>Transaction reference: {receipt.reference}</p>}
        <p>{receipt.reason}</p>
        <p>Recorded by {receipt.recordedByName}</p>
      </section>
      <footer>
        {receipt.kind === 'CREDIT'
          ? 'This credit note preserves the original invoice and reduces its amount due.'
          : 'This receipt records the staff-confirmed transaction. UPI entries are not automatically verified by a payment provider.'}
      </footer>
    </article>
  );
}
