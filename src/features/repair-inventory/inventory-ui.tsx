import { useRef, useState, type ReactNode } from 'react';
import { ActionsContext, useStockActions } from './stock-actions-context';
import { useAppSelector } from '@/app/hooks';
import { repairError } from '@/features/repair-bookings/repair-utils';
import { useStockOperationMutation, type Operation } from './inventory-api';
function restore(key: string, mode: 'stock' | 'billing'): Operation | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (
      raw &&
      typeof raw === 'object' &&
      'path' in raw &&
      typeof raw.path === 'string' &&
      (mode === 'stock'
        ? /^(inventory\/|jobs\/JOB-[A-F0-9]{16}\/parts)/
        : /^(billing\/settings$|jobs\/JOB-[A-F0-9]{16}\/billing\/(invoice|payments|refunds|credits|delivery-authorization|followups)$)/
      ).test(raw.path) &&
      'method' in raw &&
      ['POST', 'PATCH'].includes(String(raw.method)) &&
      'body' in raw &&
      raw.body &&
      typeof raw.body === 'object' &&
      'idempotencyKey' in raw.body &&
      typeof raw.body.idempotencyKey === 'string'
    )
      return raw as Operation;
  } catch {
    /* Storage may be unavailable. Sending will require a saved retry record. */
  }
  return null;
}
export function StockActions({
  scope,
  children,
  mode = 'stock',
}: {
  scope: string;
  children: ReactNode;
  mode?: 'stock' | 'billing';
}) {
  const actor = useAppSelector((s) => s.session.admin?.id ?? '');
  return (
    <ActionsProvider
      key={`${mode}:${actor}:${scope}`}
      storageKey={`ifixer-${mode}:${actor}:${scope}`}
      mode={mode}
    >
      {children}
    </ActionsProvider>
  );
}
function ActionsProvider({
  storageKey,
  children,
  mode,
}: {
  storageKey: string;
  children: ReactNode;
  mode: 'stock' | 'billing';
}) {
  const [pending, setPending] = useState<Operation | null>(() => restore(storageKey, mode));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [send, state] = useStockOperationMutation();
  const inFlight = useRef(false);
  async function execute(operation: Operation) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setError('');
    setMessage('');
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(operation));
    } catch {
      setError(
        `Browser storage is unavailable. Enable session storage before changing ${mode === 'billing' ? 'billing records' : 'stock'} so a lost response can be retried safely.`,
      );
      inFlight.current = false;
      return false;
    }
    setPending(operation);
    try {
      await send(operation).unwrap();
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Exact replay remains safe. */
      }
      setPending(null);
      setMessage(
        mode === 'billing'
          ? 'Saved. Billing and job details refreshed.'
          : 'Saved. Stock and job details refreshed.',
      );
      return true;
    } catch (failure) {
      setError(repairError(failure));
      const status =
        failure && typeof failure === 'object' && 'status' in failure ? failure.status : undefined;
      if (
        typeof status === 'number' &&
        [400, 403, 404, 409, 422, 429].includes(status) &&
        (!pending || ![403, 429].includes(status))
      ) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Server rejected the request. */
        }
        setPending(null);
      }
      return false;
    } finally {
      inFlight.current = false;
    }
  }
  const run = (operation: Operation) =>
    pending || state.isLoading
      ? Promise.resolve(false)
      : execute({ ...operation, body: { ...operation.body, idempotencyKey: crypto.randomUUID() } });
  return (
    <ActionsContext.Provider value={{ locked: !!pending || state.isLoading, run }}>
      {message && (
        <p role="status" className="repair-form-notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="repair-form-error">
          {error}
        </p>
      )}
      {pending && (
        <div className="repair-form-notice">
          <p>
            A {mode === 'billing' ? 'billing' : 'stock'} request is awaiting confirmation. Retry the
            saved request before making another change here.
          </p>
          <button
            className="repair-button"
            disabled={state.isLoading}
            onClick={() => void execute(pending)}
          >
            {state.isLoading ? 'Saving…' : 'Retry saved request'}
          </button>
        </div>
      )}
      {children}
    </ActionsContext.Provider>
  );
}
export function StockForm({
  title,
  button,
  children,
  submit,
}: {
  title: string;
  button: string;
  children: ReactNode;
  submit: (data: FormData) => Operation;
}) {
  const { locked, run } = useStockActions();
  const [error, setError] = useState('');
  return (
    <form
      className="repair-job-form"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError('');
        try {
          void run(submit(data)).then((saved) => {
            if (saved) form.reset();
          });
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : 'Check the form fields.');
        }
      }}
    >
      <h3>{title}</h3>
      <fieldset disabled={locked}>
        {children}
        {error && <p role="alert">{error}</p>}
        <button className="repair-button" type="submit">
          {button}
        </button>
      </fieldset>
    </form>
  );
}
export function Input({
  label,
  name,
  value,
  required = true,
  type = 'text',
  maxLength = 120,
  min = 0,
  max = 100000,
  step = 1,
}: {
  label: string;
  name: string;
  value?: string | number;
  required?: boolean;
  type?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <label className="repair-field">
      {label}
      <input
        name={name}
        defaultValue={value}
        required={required}
        type={type}
        maxLength={maxLength}
        min={type === 'number' ? min : undefined}
        max={type === 'number' ? max : undefined}
        step={step}
      />
    </label>
  );
}
export function Reason({
  name = 'reason',
  label = 'Reason / reference',
}: {
  name?: string;
  label?: string;
}) {
  return (
    <label className="repair-field">
      {label}
      <textarea name={name} required minLength={3} maxLength={500} rows={2} />
    </label>
  );
}
export function Pager({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  return (
    <nav className="stock-pager" aria-label="Results pages">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, pages)}
      </span>
      <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
export function QueryState({
  query,
}: {
  query: { isLoading: boolean; isError: boolean; error?: unknown; refetch: () => unknown };
}) {
  return (
    <>
      {query.isLoading && <p role="status">Loading…</p>}
      {query.isError && (
        <p role="alert">
          {repairError(query.error)} <button onClick={() => query.refetch()}>Refresh</button>
        </p>
      )}
    </>
  );
}
