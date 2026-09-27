import { type CSSProperties, type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import type {
  AnalyticsMetric,
  AnalyticsQuery,
} from '@/features/admin-analytics/admin-analytics.types';
import {
  useGetGoogleReviewSettingQuery,
  useGetWebsiteInsightsQuery,
  useSaveGoogleReviewSettingMutation,
} from '@/features/website/website-api';
import { apiErrorMessage } from '@/shared/commerce';

const dayMs = 86_400_000;

function istDate(offsetDays = 0): string {
  return new Date(Date.now() + 330 * 60 * 1000 + offsetDays * dayMs).toISOString().slice(0, 10);
}

function queryFrom(params: URLSearchParams): AnalyticsQuery {
  return {
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo: params.get('dateTo') ?? undefined,
  };
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function changeLabel(metric: AnalyticsMetric): string {
  if (metric.changePercent === null) return 'New vs previous period';
  const prefix = metric.changePercent > 0 ? '+' : '';
  return `${prefix}${metric.changePercent}% vs previous period`;
}

function TrafficMetric({ label, metric }: { label: string; metric: AnalyticsMetric }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{metric.value.toLocaleString('en-IN')}</strong>
      <small
        data-direction={metric.changePercent === null ? 'new' : Math.sign(metric.changePercent)}
      >
        {changeLabel(metric)}
      </small>
    </article>
  );
}

function sourceLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const query = queryFrom(params);
  const insights = useGetWebsiteInsightsQuery(query);
  const settings = useGetGoogleReviewSettingQuery();
  const [saveSetting, saveState] = useSaveGoogleReviewSettingMutation();
  const roles = useAppSelector((state) => state.session.admin?.roles ?? []);
  const isOwner = roles.includes('OWNER');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const data = insights.data;
  const chartMax = Math.max(1, ...(data?.trend.map((point) => point.pageViews) ?? [1]));

  function applyPreset(days: number) {
    setParams({ dateFrom: istDate(-(days - 1)), dateTo: istDate() });
  }

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setParams({ dateFrom: formText(form, 'dateFrom'), dateTo: formText(form, 'dateTo') });
  }

  async function saveReviewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings.data) return;
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const saved = await saveSetting({
        googleReviewUrl: formText(form, 'googleReviewUrl'),
        expectedVersion: settings.data.version,
      }).unwrap();
      setMessage(
        saved.configured
          ? 'Google review button is now available on the website.'
          : 'Google review button is hidden.',
      );
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Google review settings could not be saved.'));
    }
  }

  return (
    <section className="admin-page admin-website-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Website performance</p>
          <h1>Website traffic</h1>
          <p>See visits, popular pages, traffic sources, devices and Google review clicks.</p>
        </div>
        <span>
          {data
            ? `Updated ${new Date(data.generatedAt).toLocaleTimeString('en-IN')}`
            : 'Live report'}
        </span>
      </header>

      <div className="analytics-presets" aria-label="Quick website traffic ranges">
        {[7, 30, 90].map((days) => (
          <button type="button" key={days} onClick={() => applyPreset(days)}>
            {days} days
          </button>
        ))}
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
        <button type="submit">Apply</button>
      </form>

      {insights.isError ? (
        <InlineError
          message="Website traffic could not be loaded."
          onRetry={() => void insights.refetch()}
        />
      ) : null}
      {insights.isLoading ? <p className="admin-empty">Calculating website traffic…</p> : null}
      {data ? (
        <>
          <p className="analytics-period-note">
            {data.period.dateFrom} — {data.period.dateTo} · Asia/Kolkata
          </p>
          <div className="analytics-kpis website-traffic-kpis" aria-label="Website traffic metrics">
            <TrafficMetric label="Page views" metric={data.kpis.pageViews} />
            <TrafficMetric label="Visits" metric={data.kpis.visits} />
            <TrafficMetric label="Unique visitors" metric={data.kpis.uniqueVisitors} />
            <TrafficMetric label="Google review clicks" metric={data.kpis.googleReviewClicks} />
          </div>

          <section className="analytics-chart-panel" aria-labelledby="traffic-trend-heading">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Audience</p>
                <h2 id="traffic-trend-heading">Traffic trend</h2>
              </div>
              <span>Page views by period</span>
            </div>
            <div
              className="analytics-chart"
              role="img"
              aria-label="Website page views by reporting period"
            >
              {data.trend.map((point) => (
                <div
                  className="analytics-chart__point"
                  key={point.key}
                  title={`${point.key}: ${point.pageViews} page views, ${point.visits} visits`}
                >
                  <div className="analytics-chart__track">
                    <i
                      style={
                        {
                          '--bar-size': `${Math.max(2, (point.pageViews / chartMax) * 100)}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <span>{point.key}</span>
                  <small>{point.visits} visits</small>
                </div>
              ))}
            </div>
          </section>

          <div className="website-traffic-details">
            <section className="admin-panel">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Content</p>
                  <h2>Top pages</h2>
                </div>
              </div>
              {data.topPages.length ? (
                <ol className="analytics-ranked-list">
                  {data.topPages.map((page) => (
                    <li key={page.path}>
                      <div>
                        <strong>{page.path}</strong>
                        <span>{page.visits} visits</span>
                      </div>
                      <strong>{page.pageViews} views</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-empty">No website visits in this period.</p>
              )}
            </section>
            <section className="admin-panel">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Discovery</p>
                  <h2>Traffic sources</h2>
                </div>
              </div>
              {data.sources.length ? (
                <ul className="website-breakdown-list">
                  {data.sources.map((source) => (
                    <li key={source.source}>
                      <span>{sourceLabel(source.source)}</span>
                      <strong>{source.visits} visits</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">No traffic source data yet.</p>
              )}
            </section>
            <section className="admin-panel">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Screens</p>
                  <h2>Devices</h2>
                </div>
              </div>
              {data.devices.length ? (
                <ul className="website-breakdown-list">
                  {data.devices.map((device) => (
                    <li key={device.device}>
                      <span>{sourceLabel(device.device)}</span>
                      <strong>{device.pageViews} views</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">No device data yet.</p>
              )}
            </section>
          </div>
          <p className="website-privacy-note">
            Traffic uses anonymous hashed visitor and session IDs. IP addresses and raw browser
            fingerprints are not stored.
          </p>
        </>
      ) : null}

      <section
        className="admin-panel google-review-settings"
        aria-labelledby="google-review-settings-title"
      >
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Customer feedback</p>
            <h2 id="google-review-settings-title">Google reviews</h2>
          </div>
          {settings.data?.configured ? (
            <a href={settings.data.googleReviewUrl} target="_blank" rel="noopener noreferrer">
              Open current link ↗
            </a>
          ) : null}
        </div>
        <p>
          Paste the “Ask for reviews” link from your Google Business Profile. Customers will see the
          review button across the website.
        </p>
        {settings.isError ? (
          <InlineError
            message="Google review settings could not be loaded."
            onRetry={() => void settings.refetch()}
          />
        ) : null}
        {isOwner && settings.data ? (
          <form
            key={`${settings.data.version}:${settings.data.googleReviewUrl}`}
            onSubmit={(event) => void saveReviewLink(event)}
          >
            <label>
              <span>Google review link</span>
              <input
                name="googleReviewUrl"
                type="url"
                placeholder="https://g.page/r/.../review"
                defaultValue={settings.data.googleReviewUrl}
              />
            </label>
            <small>Leave the field empty and save to hide the customer review button.</small>
            <button type="submit" disabled={saveState.isLoading}>
              {saveState.isLoading ? 'Saving…' : 'Save review link'}
            </button>
          </form>
        ) : settings.data ? (
          <p className="admin-empty">Only an owner can change this link.</p>
        ) : null}
        {message ? (
          <p className="auth-message" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="auth-message" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </section>
  );
}
