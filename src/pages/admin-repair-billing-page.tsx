import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { useAppSelector } from '@/app/hooks';
import {
  useBillingSettingsQuery,
  useRepairInvoicesQuery,
} from '@/features/repair-billing/billing-api';
import type { BillingSettings } from '@/features/repair-billing/billing.types';
import {
  StockActions,
  StockForm,
  Input,
  Pager,
  QueryState,
} from '@/features/repair-inventory/inventory-ui';
import { field, amount, money } from '@/features/repair-inventory/inventory-utils';
export function Component() {
  const owner = useAppSelector((s) => s.session.admin?.roles.includes('OWNER'));
  const [tab, setTab] = useState('invoices');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const invoices = useRepairInvoicesQuery({ page, search });
  const settings = useBillingSettingsQuery();
  return (
    <section className="admin-page stock-page billing-page">
      <PageMeta
        noIndex
        title="Billing & warranty"
        description="Repair invoices, payments and configurable warranty terms."
      />
      <header className="repair-job-heading">
        <div>
          <p className="repair-eyebrow">SHOP ACCOUNTS</p>
          <h1>Billing & warranty</h1>
          <p>Issue a bill from a repair job and record money received or returned.</p>
        </div>
      </header>
      {owner && (
        <nav className="repair-job-tabs" aria-label="Billing sections">
          <button
            onClick={() => setTab('invoices')}
            aria-current={tab === 'invoices' ? 'page' : undefined}
          >
            Invoices
          </button>
          <button
            onClick={() => setTab('settings')}
            aria-current={tab === 'settings' ? 'page' : undefined}
          >
            Billing settings
          </button>
        </nav>
      )}
      {settings.data && !settings.data.configured && (
        <p className="repair-form-notice">
          The owner must configure shop details, taxes and warranty terms before the first invoice
          or payment receipt.
        </p>
      )}
      {tab === 'settings' && owner ? (
        <>
          <QueryState query={settings} />
          {settings.data && !settings.isError && (
            <StockActions mode="billing" scope="settings">
              <SettingsEditor key={settings.data.version} settings={settings.data} />
            </StockActions>
          )}
        </>
      ) : (
        <>
          <label className="repair-field">
            Search invoices
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Invoice, job, customer or phone"
            />
          </label>
          <QueryState query={invoices} />
          <div className="stock-card-grid">
            {!invoices.isError &&
              invoices.data?.items.map((invoice) => (
                <article className="stock-card" key={invoice.id}>
                  <p className="repair-eyebrow">{invoice.number}</p>
                  <h2>{invoice.customerName}</h2>
                  <p>{invoice.deviceLabel}</p>
                  <p>
                    Total {money(invoice.totalInPaise)} · Due {money(invoice.summary?.dueInPaise)}
                  </p>
                  {(invoice.summary?.refundDueInPaise ?? 0) > 0 && (
                    <p>Refund due {money(invoice.summary?.refundDueInPaise)}</p>
                  )}
                  <Link to={`/admin/repair/jobs/${invoice.jobNumber}?tab=billing`}>
                    Open job billing
                  </Link>
                  <p>
                    <Link to={`/admin/repair/jobs/${invoice.jobNumber}/billing/print`}>
                      Invoice & warranty receipt
                    </Link>
                  </p>
                </article>
              ))}
          </div>
          {invoices.data && !invoices.isError && (
            <>
              <p>{invoices.data.total} invoices</p>
              <Pager page={page} pages={invoices.data.totalPages} setPage={setPage} />
            </>
          )}
          <p>
            Open a <Link to="/admin/repair/jobs">repair job</Link> to record an advance or issue its
            invoice.
          </p>
        </>
      )}
    </section>
  );
}
function SettingsEditor({ settings }: { settings: BillingSettings }) {
  const [taxes, setTaxes] = useState(() =>
    (settings.taxes ?? []).map((tax, key) => ({ ...tax, key })),
  );
  const [next, setNext] = useState(taxes.length);
  return (
    <StockForm
      title="Shop billing settings"
      button="Save billing settings"
      submit={(data) => ({
        path: 'billing/settings',
        method: 'POST',
        body: {
          expectedVersion: settings.version,
          issuer: {
            name: field(data, 'name'),
            address: field(data, 'address'),
            phone: field(data, 'phone'),
            taxId: field(data, 'taxId') || undefined,
          },
          taxes: taxes.map((tax) => ({
            label: field(data, `label-${tax.key}`),
            rateBps: amount(data, `tax-${tax.key}`),
          })),
          warrantyDays: Number(field(data, 'warrantyDays')),
          warrantyCoverage: field(data, 'warrantyCoverage'),
          warrantyExclusions: field(data, 'warrantyExclusions'),
          invoiceNote: field(data, 'invoiceNote') || undefined,
        },
      })}
    >
      <p>
        Changes apply to future invoices and receipts. Already issued documents keep their original
        details and warranty terms.
      </p>
      <Input
        label="Invoice business name"
        name="name"
        maxLength={160}
        value={settings.issuer?.name}
      />
      <label className="repair-field">
        Business address
        <textarea
          name="address"
          defaultValue={settings.issuer?.address}
          required
          minLength={5}
          maxLength={1000}
          rows={3}
        />
      </label>
      <Input
        label="Business phone"
        name="phone"
        type="tel"
        maxLength={20}
        value={settings.issuer?.phone}
      />
      <Input
        label="Tax registration ID (optional)"
        name="taxId"
        required={false}
        maxLength={80}
        value={settings.issuer?.taxId}
      />
      <h4>Configured taxes</h4>
      <p>
        Enter the rates applicable to your shop. Each component is calculated on the amount after
        discount and rounded to the nearest paise. Leave the list empty when no tax is to be
        applied.
      </p>
      {taxes.map((tax, index) => (
        <div className="stock-purchase-line" key={tax.key}>
          <Input
            label={`Tax label ${index + 1}`}
            name={`label-${tax.key}`}
            value={tax.label}
            maxLength={80}
          />
          <Input
            label={`Tax rate % ${index + 1}`}
            name={`tax-${tax.key}`}
            value={(tax.rateBps / 100).toFixed(2)}
            type="number"
            max={100}
            step="0.01"
          />
          <button type="button" onClick={() => setTaxes(taxes.filter((t) => t.key !== tax.key))}>
            Remove tax {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={taxes.length >= 5}
        onClick={() => {
          setTaxes([...taxes, { key: next, label: '', rateBps: 0 }]);
          setNext(next + 1);
        }}
      >
        Add tax component
      </button>
      <h4>Default repair warranty</h4>
      <Input
        label="Warranty days"
        name="warrantyDays"
        type="number"
        max={1095}
        value={settings.warrantyDays}
      />
      <p>
        Enter 0 when no warranty is offered and state that explicitly in the coverage terms.
        Coverage starts at device delivery. The owner can override these defaults before an invoice
        is issued.
      </p>
      <label className="repair-field">
        Warranty coverage
        <textarea
          name="warrantyCoverage"
          defaultValue={settings.warrantyCoverage}
          required
          minLength={3}
          maxLength={2000}
          rows={3}
        />
      </label>
      <label className="repair-field">
        Warranty exclusions / conditions
        <textarea
          name="warrantyExclusions"
          defaultValue={settings.warrantyExclusions}
          required
          minLength={3}
          maxLength={2000}
          rows={3}
        />
      </label>
      <label className="repair-field">
        Invoice footer note (optional)
        <textarea
          name="invoiceNote"
          defaultValue={settings.invoiceNote}
          maxLength={1000}
          rows={2}
        />
      </label>
    </StockForm>
  );
}
