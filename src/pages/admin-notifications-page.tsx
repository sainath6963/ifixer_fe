import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import {
  useGetAdminNotificationsQuery,
  useGetAdminOutboxQuery,
  useGetNotificationOperationsSummaryQuery,
  useRetryAdminNotificationMutation,
  useRetryAdminOutboxMutation,
} from '@/features/admin/admin-operations-api';
import type {
  NotificationChannel,
  NotificationStatus,
  OutboxStatus,
} from '@/features/admin/admin.types';
import { apiErrorMessage } from '@/shared/commerce';

const notificationStatuses: Array<NotificationStatus | ''> = [
  '',
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'DEAD',
];
const outboxStatuses: Array<OutboxStatus | ''> = [
  '',
  'PENDING',
  'PROCESSING',
  'PUBLISHED',
  'FAILED',
  'DEAD',
];
const notificationChannels: Array<NotificationChannel | ''> = ['', 'EMAIL', 'SMS', 'WHATSAPP'];
const pageLimit = 25;

function allowedStatus<T extends string>(raw: string, values: Array<T | ''>): T | undefined {
  return raw && values.includes(raw as T) ? (raw as T) : undefined;
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'outbox' ? 'outbox' : 'deliveries';
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const templateKey = params.get('templateKey')?.trim() ?? '';
  const rawStatus = params.get('status') ?? '';
  const channel = allowedStatus(params.get('channel') ?? '', notificationChannels);
  const notificationStatus = allowedStatus(rawStatus, notificationStatuses);
  const outboxStatus = allowedStatus(rawStatus, outboxStatuses);
  const isOwner = useAppSelector((state) => state.session.admin?.roles.includes('OWNER') ?? false);
  const summary = useGetNotificationOperationsSummaryQuery();
  const deliveries = useGetAdminNotificationsQuery(
    view === 'deliveries'
      ? {
          page,
          limit: pageLimit,
          status: notificationStatus,
          channel,
          search: search || undefined,
          templateKey: templateKey || undefined,
        }
      : undefined,
    { skip: view !== 'deliveries' },
  );
  const outbox = useGetAdminOutboxQuery(
    view === 'outbox'
      ? { page, limit: pageLimit, status: outboxStatus, search: search || undefined }
      : undefined,
    { skip: view !== 'outbox' },
  );
  const [retryNotification, retryNotificationState] = useRetryAdminNotificationMutation();
  const [retryOutbox, retryOutboxState] = useRetryAdminOutboxMutation();
  const [actionId, setActionId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState('');

  function update(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete('page');
    setParams(next);
  }

  function switchView(nextView: 'deliveries' | 'outbox') {
    setParams(nextView === 'outbox' ? { view: 'outbox' } : {});
  }

  function updateSearch(nextSearch: string, nextTemplateKey: string) {
    const next = new URLSearchParams(params);
    if (nextSearch) next.set('search', nextSearch);
    else next.delete('search');
    if (view === 'deliveries' && nextTemplateKey) next.set('templateKey', nextTemplateKey);
    else next.delete('templateKey');
    next.delete('page');
    setParams(next);
  }

  async function retryDelivery(id: string) {
    setActionId(id);
    setErrorMessage('');
    try {
      await retryNotification(id).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Notification retry could not be scheduled.'));
    } finally {
      setActionId(undefined);
    }
  }

  async function retryEvent(id: string) {
    setActionId(id);
    setErrorMessage('');
    try {
      await retryOutbox(id).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Outbox retry could not be scheduled.'));
    } finally {
      setActionId(undefined);
    }
  }

  const activePage = view === 'deliveries' ? deliveries.data : outbox.data;
  const activeFetching = view === 'deliveries' ? deliveries.isFetching : outbox.isFetching;

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Communication operations</p>
          <h1>Events & messaging</h1>
          <p>Search delivery queues and isolate failures without exposing message payloads.</p>
        </div>
      </header>

      <div className="admin-summary-strip">
        <div>
          <span>Pending deliveries</span>
          <strong>{summary.data?.notifications.PENDING ?? '—'}</strong>
        </div>
        <div>
          <span>Failed deliveries</span>
          <strong>{summary.data?.notifications.FAILED ?? '—'}</strong>
        </div>
        <div>
          <span>Dead deliveries</span>
          <strong>{summary.data?.notifications.DEAD ?? '—'}</strong>
        </div>
        <div>
          <span>Dead events</span>
          <strong>{summary.data?.outbox.DEAD ?? '—'}</strong>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Communication views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'deliveries'}
          onClick={() => switchView('deliveries')}
        >
          Deliveries
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'outbox'}
          onClick={() => switchView('outbox')}
        >
          Event outbox
        </button>
      </div>

      <div className="admin-filter-panel admin-filter-panel--compact">
        <QueueSearchForm
          key={`${view}:${search}:${templateKey}`}
          initialValue={search}
          initialTemplateKey={templateKey}
          includeTemplate={view === 'deliveries'}
          onSearch={updateSearch}
        />
        <label>
          <span>Status</span>
          <select
            value={(view === 'deliveries' ? notificationStatus : outboxStatus) ?? ''}
            onChange={(event) => update('status', event.target.value)}
          >
            {(view === 'deliveries' ? notificationStatuses : outboxStatuses).map((value) => (
              <option key={value || 'all'} value={value}>
                {value || 'All statuses'}
              </option>
            ))}
          </select>
        </label>
        {view === 'deliveries' ? (
          <label>
            <span>Channel</span>
            <select
              value={channel ?? ''}
              onChange={(event) => update('channel', event.target.value)}
            >
              {notificationChannels.map((value) => (
                <option key={value || 'all'} value={value}>
                  {value || 'All channels'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => setParams(view === 'outbox' ? { view: 'outbox' } : {})}
        >
          Clear filters
        </button>
      </div>

      <div className="admin-list-summary" aria-live="polite">
        <span>{activePage ? `${activePage.total} records` : 'Loading records'}</span>
        {activeFetching && activePage ? <span>Refreshing…</span> : null}
      </div>

      {errorMessage ? (
        <p className="admin-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {view === 'deliveries' ? (
        deliveries.isError ? (
          <InlineError
            message="Notifications could not be loaded."
            onRetry={() => void deliveries.refetch()}
          />
        ) : deliveries.data ? (
          <>
            <div className="admin-table-wrap" data-refreshing={deliveries.isFetching}>
              <table className="admin-table">
                <caption className="sr-only">Message deliveries</caption>
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Recipient</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {deliveries.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.templateKey}</strong>
                        <span>{item.sourceEventId}</span>
                      </td>
                      <td>{item.recipient}</td>
                      <td>{item.channel}</td>
                      <td>
                        <span className="admin-badge" data-status={item.status}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.attempts}</td>
                      <td>{new Date(item.updatedAt).toLocaleString('en-IN')}</td>
                      <td>
                        {isOwner && ['FAILED', 'DEAD'].includes(item.status) ? (
                          <button
                            className="admin-row-link"
                            type="button"
                            disabled={retryNotificationState.isLoading && actionId === item.id}
                            onClick={() => void retryDelivery(item.id)}
                          >
                            Retry
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={deliveries.data.page}
              totalPages={deliveries.data.totalPages}
              total={deliveries.data.total}
              limit={deliveries.data.limit}
              disabled={deliveries.isFetching}
              onPageChange={(nextPage) => update('page', String(nextPage), false)}
            />
          </>
        ) : (
          <div className="admin-table-loading" aria-busy="true" />
        )
      ) : outbox.isError ? (
        <InlineError
          message="Outbox events could not be loaded."
          onRetry={() => void outbox.refetch()}
        />
      ) : outbox.data ? (
        <>
          <div className="admin-table-wrap" data-refreshing={outbox.isFetching}>
            <table className="admin-table">
              <caption className="sr-only">Outbox events</caption>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Aggregate</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {outbox.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.eventType}</strong>
                      <span>{item.eventId}</span>
                    </td>
                    <td>{item.aggregateType}</td>
                    <td>
                      <span className="admin-badge" data-status={item.status}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.processingAttempts}</td>
                    <td>{new Date(item.updatedAt).toLocaleString('en-IN')}</td>
                    <td>
                      {isOwner && ['FAILED', 'DEAD'].includes(item.status) ? (
                        <button
                          className="admin-row-link"
                          type="button"
                          disabled={retryOutboxState.isLoading && actionId === item.id}
                          onClick={() => void retryEvent(item.id)}
                        >
                          Retry
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={outbox.data.page}
            totalPages={outbox.data.totalPages}
            total={outbox.data.total}
            limit={outbox.data.limit}
            disabled={outbox.isFetching}
            onPageChange={(nextPage) => update('page', String(nextPage), false)}
          />
        </>
      ) : (
        <div className="admin-table-loading" aria-busy="true" />
      )}
    </section>
  );
}

function QueueSearchForm({
  initialValue,
  initialTemplateKey,
  includeTemplate,
  onSearch,
}: {
  initialValue: string;
  initialTemplateKey: string;
  includeTemplate: boolean;
  onSearch: (value: string, templateKey: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [templateKey, setTemplateKey] = useState(initialTemplateKey);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim(), templateKey.trim());
  }
  return (
    <form role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="admin-queue-search">
        Search queue records
      </label>
      <input
        id="admin-queue-search"
        type="search"
        value={value}
        maxLength={160}
        placeholder="Recipient, event or aggregate"
        onChange={(event) => setValue(event.target.value)}
      />
      {includeTemplate ? (
        <input
          value={templateKey}
          maxLength={160}
          aria-label="Template key"
          placeholder="Template key"
          onChange={(event) => setTemplateKey(event.target.value)}
        />
      ) : null}
      <button type="submit">Search</button>
    </form>
  );
}
