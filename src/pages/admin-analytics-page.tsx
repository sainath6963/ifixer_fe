import { type CSSProperties, type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import {
  useExportAdminAnalyticsMutation,
  useGetAdminAnalyticsQuery,
} from '@/features/admin-analytics/admin-analytics-api';
import type {
  AnalyticsGranularity,
  AnalyticsMetric,
  AnalyticsQuery,
} from '@/features/admin-analytics/admin-analytics.types';
import { apiErrorMessage, formatPrice } from '@/shared/commerce';

const dayMs = 86_400_000;

function istDate(offsetDays = 0): string {
  const now = new Date(Date.now() + 330 * 60 * 1000 + offsetDays * dayMs);
  return now.toISOString().slice(0, 10);
}

function queryFrom(params: URLSearchParams): AnalyticsQuery {
  const dateFrom = params.get('dateFrom') ?? undefined;
  const dateTo = params.get('dateTo') ?? undefined;
  const value = params.get('granularity');
  const granularity: AnalyticsGranularity | undefined =
    value === 'DAY' || value === 'WEEK' || value === 'MONTH' ? value : undefined;
  return { dateFrom, dateTo, granularity };
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function changeLabel(metric: AnalyticsMetric): string {
  if (metric.changePercent === null) return 'New vs previous period';
  const prefix = metric.changePercent > 0 ? '+' : '';
  return `${prefix}${metric.changePercent}% vs previous period`;
}

function MetricCard({
  label,
  metric,
  money = false,
}: {
  label: string;
  metric: AnalyticsMetric;
  money?: boolean;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{money ? formatPrice(metric.value) : metric.value.toLocaleString('en-IN')}</strong>
      <small
        data-direction={metric.changePercent === null ? 'new' : Math.sign(metric.changePercent)}
      >
        {changeLabel(metric)}
      </small>
    </article>
  );
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const query = queryFrom(params);
  const analytics = useGetAdminAnalyticsQuery(query);
  const [exportCsv, exportState] = useExportAdminAnalyticsMutation();
  const [exportError, setExportError] = useState('');
  const data = analytics.data;
  const chartMax = Math.max(1, ...(data?.trend.map((point) => point.grossSalesInPaise) ?? [1]));

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const dateFrom = formText(form, 'dateFrom');
    const dateTo = formText(form, 'dateTo');
    const granularity = formText(form, 'granularity');
    if (dateFrom && dateTo) {
      next.set('dateFrom', dateFrom);
      next.set('dateTo', dateTo);
    }
    if (granularity && granularity !== 'AUTO') next.set('granularity', granularity);
    setParams(next);
  }

  function applyPreset(days: number) {
    const next = new URLSearchParams();
    next.set('dateFrom', istDate(-(days - 1)));
    next.set('dateTo', istDate());
    setParams(next);
  }

  async function downloadCsv() {
    setExportError('');
    try {
      const blob = await exportCsv(query).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `rich-culture-analytics-${data?.period.dateFrom ?? 'report'}-to-${data?.period.dateTo ?? 'today'}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(apiErrorMessage(error, 'The CSV report could not be downloaded.'));
    }
  }

  return (
    <section className="admin-page admin-analytics-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Business intelligence</p>
          <h1>Analytics</h1>
          <p>
            Captured sales, settled refunds and customer growth on India business-day boundaries.
          </p>
        </div>
        <span>
          {data
            ? `Generated ${new Date(data.generatedAt).toLocaleTimeString('en-IN')}`
            : 'Live report'}
        </span>
      </header>

      <div className="analytics-presets" aria-label="Quick date ranges">
        <button type="button" onClick={() => applyPreset(7)}>
          7 days
        </button>
        <button type="button" onClick={() => applyPreset(30)}>
          30 days
        </button>
        <button type="button" onClick={() => applyPreset(90)}>
          90 days
        </button>
        <button type="button" onClick={() => setParams(new URLSearchParams())}>
          Default
        </button>
      </div>
      <form
        className="admin-toolbar analytics-toolbar"
        key={params.toString()}
        onSubmit={applyRange}
      >
        <label>
          <span>From</span>
          <input
            name="dateFrom"
            type="date"
            defaultValue={query.dateFrom ?? istDate(-29)}
            max={query.dateTo ?? istDate()}
            required
          />
        </label>
        <label>
          <span>To</span>
          <input
            name="dateTo"
            type="date"
            defaultValue={query.dateTo ?? istDate()}
            min={query.dateFrom}
            max={istDate()}
            required
          />
        </label>
        <label>
          <span>Grouping</span>
          <select name="granularity" defaultValue={query.granularity ?? 'AUTO'}>
            <option value="AUTO">Automatic</option>
            <option value="DAY">Daily</option>
            <option value="WEEK">Weekly</option>
            <option value="MONTH">Monthly</option>
          </select>
        </label>
        <button type="submit">Apply</button>
        <button
          className="analytics-export"
          type="button"
          disabled={exportState.isLoading || !data}
          onClick={() => void downloadCsv()}
        >
          {exportState.isLoading ? 'Preparing…' : 'Export CSV'}
        </button>
      </form>
      {exportError ? (
        <p className="auth-message" role="alert">
          {exportError}
        </p>
      ) : null}

      {analytics.isError ? (
        <InlineError
          message="Analytics could not be loaded."
          onRetry={() => void analytics.refetch()}
        />
      ) : null}
      {analytics.isLoading ? <p className="admin-empty">Calculating business metrics…</p> : null}

      {data ? (
        <>
          <p className="analytics-period-note">
            {data.period.dateFrom} — {data.period.dateTo} · {data.period.granularity.toLowerCase()}{' '}
            · Asia/Kolkata
          </p>
          <div className="analytics-kpis" aria-label="Business metrics">
            <MetricCard label="Gross captured" metric={data.kpis.grossSalesInPaise} money />
            <MetricCard label="Settled refunds" metric={data.kpis.refundsInPaise} money />
            <MetricCard label="Net revenue" metric={data.kpis.netRevenueInPaise} money />
            <MetricCard label="Paid orders" metric={data.kpis.paidOrders} />
            <MetricCard label="Average order" metric={data.kpis.averageOrderValueInPaise} money />
            <MetricCard label="New customers" metric={data.kpis.newCustomers} />
          </div>

          <section className="analytics-chart-panel" aria-labelledby="revenue-trend-heading">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Cash movement</p>
                <h2 id="revenue-trend-heading">Revenue trend</h2>
              </div>
              <span>Gross less refunds</span>
            </div>
            <div
              className="analytics-chart"
              role="img"
              aria-label="Gross captured sales by reporting period"
            >
              {data.trend.map((point) => (
                <div
                  className="analytics-chart__point"
                  key={point.key}
                  title={`${point.key}: ${formatPrice(point.grossSalesInPaise)} gross, ${formatPrice(point.refundsInPaise)} refunded`}
                >
                  <div className="analytics-chart__track">
                    <i
                      style={
                        {
                          '--bar-size': `${Math.max(2, (point.grossSalesInPaise / chartMax) * 100)}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <span>{point.key}</span>
                  <small>{point.orders} orders</small>
                </div>
              ))}
            </div>
          </section>

          <div className="analytics-detail-grid">
            <section className="admin-panel">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Merchandise</p>
                  <h2>Top products</h2>
                </div>
              </div>
              {data.topProducts.length ? (
                <ol className="analytics-ranked-list">
                  {data.topProducts.map((product) => (
                    <li key={product.productId}>
                      <div>
                        <Link to={`/admin/catalog/products/${product.productId}`}>
                          {product.name}
                        </Link>
                        <span>{product.unitsSold} units</span>
                      </div>
                      <strong>{formatPrice(product.itemSalesInPaise)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-empty">No captured product sales in this period.</p>
              )}
            </section>
            <section className="admin-panel">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Inventory risk</p>
                  <h2>Low stock</h2>
                </div>
                <Link to="/admin/catalog">Catalog ↗</Link>
              </div>
              {data.lowStock.length ? (
                <ul className="analytics-stock-list">
                  {data.lowStock.map((item) => (
                    <li key={item.variantId}>
                      <div>
                        <Link to={`/admin/catalog/products/${item.productId}`}>
                          {item.productName}
                        </Link>
                        <span>
                          {item.variantTitle} · {item.sku}
                        </span>
                      </div>
                      <strong>
                        {item.available} <small>available / reorder {item.reorderPoint}</small>
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">
                  No active options are at or below their reorder point.
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
