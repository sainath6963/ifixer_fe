import { useRef, useState } from 'react';
import { PageMeta } from '@/app/components/page-meta';
import {
  useInstagramReelsQuery,
  useSaveInstagramReelMutation,
  type InstagramReel,
} from '@/features/instagram-reels/reels-api';
import { ReelCard } from '@/features/instagram-reels/workshop-reels';
import { repairError } from '@/features/repair-bookings/repair-utils';
import { field } from '@/features/repair-inventory/inventory-utils';
import { Pager, QueryState } from '@/features/repair-inventory/inventory-ui';

export function Component() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const query = useInstagramReelsQuery({ page, admin: true });
  const selected = query.data?.items.find((reel) => reel.id === editing);
  return (
    <section className="admin-page">
      <PageMeta
        noIndex
        title="Instagram reels"
        description="Manage the Reel links shown on the iFixer website."
      />
      <header className="admin-page-header">
        <div>
          <p className="repair-eyebrow">FROM THE WORKSHOP</p>
          <h1>Instagram reels</h1>
          <p>
            Add a Reel link to show it on the homepage. Change its title, display order or
            visibility at any time.
          </p>
        </div>
      </header>
      <p className="repair-form-notice">
        Use a public Reel from an account that allows website embeds. Paste its link, not embed
        HTML. Private, deleted or restricted videos may not play here.
      </p>
      {message && (
        <p role="status" className="repair-form-notice">
          {message}
        </p>
      )}
      <QueryState query={query} />
      {query.data && !query.isError && (
        <div className="reels-admin-grid">
          <section aria-label="Saved reels">
            <div className="stock-toolbar">
              <h2>Saved reels</h2>
              <button
                className="repair-secondary-button"
                onClick={() => {
                  setEditing(undefined);
                  setRevision(revision + 1);
                  setMessage('');
                }}
              >
                Add reel
              </button>
            </div>
            <ul className="reels-admin-list">
              {query.data.items.map((reel) => (
                <li key={reel.id}>
                  <strong>{reel.title || 'Untitled reel'}</strong>
                  <span>
                    {reel.active ? 'Shown on website' : 'Hidden'} · Order {reel.sortOrder}
                  </span>
                  <a href={reel.url} target="_blank" rel="noopener noreferrer">
                    {reel.url}
                  </a>
                  <button
                    className="repair-text-link"
                    onClick={() => {
                      setEditing(reel.id);
                      setMessage('');
                    }}
                  >
                    Edit<span className="sr-only"> {reel.title || reel.url}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!query.data.total && <p>No reels added yet. Paste your first Instagram Reel link.</p>}
            <Pager
              page={page}
              pages={query.data.totalPages}
              setPage={(value) => {
                setPage(value);
                setEditing(undefined);
              }}
            />
            <a
              className="repair-text-link"
              href="/#workshop-reels"
              target="_blank"
              rel="noopener noreferrer"
            >
              View homepage ↗
            </a>
          </section>
          <ReelEditor
            key={`${selected?.id ?? 'new'}:${selected?.version ?? 0}:${revision}`}
            reel={selected}
            onSaved={(reel) => {
              setMessage(
                reel.active
                  ? 'Reel saved and shown on the homepage.'
                  : 'Reel saved and hidden from the homepage.',
              );
              setEditing(undefined);
              setRevision(revision + 1);
            }}
          />
        </div>
      )}
    </section>
  );
}
function ReelEditor({
  reel,
  onSaved,
}: {
  reel?: InstagramReel;
  onSaved: (reel: InstagramReel) => void;
}) {
  const [save, mutation] = useSaveInstagramReelMutation();
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const inFlight = useRef(false);
  return (
    <section>
      <form
        className="repair-job-form"
        aria-label={reel ? 'Edit Instagram reel' : 'Add Instagram reel'}
        onSubmit={(event) => {
          event.preventDefault();
          if (inFlight.current) return;
          const data = new FormData(event.currentTarget);
          inFlight.current = true;
          setError('');
          void save({
            id: reel?.id,
            body: {
              url: field(data, 'url'),
              title: field(data, 'title'),
              active: data.get('active') === 'on',
              sortOrder: Number(data.get('sortOrder')),
              ...(reel ? { expectedVersion: reel.version } : {}),
            },
          })
            .unwrap()
            .then(onSaved)
            .catch((failure) => setError(repairError(failure)))
            .finally(() => {
              inFlight.current = false;
            });
        }}
      >
        <h2>{reel ? 'Edit reel' : 'Add a reel'}</h2>
        <fieldset disabled={mutation.isLoading}>
          <label className="repair-field">
            Instagram Reel link
            <input
              type="url"
              name="url"
              defaultValue={reel?.url ?? ''}
              required
              maxLength={2048}
              placeholder="https://www.instagram.com/reel/…/"
            />
          </label>
          <label className="repair-field">
            Title (optional)
            <input
              name="title"
              defaultValue={reel?.title ?? ''}
              maxLength={120}
              placeholder="For example, a screen repair at the workshop"
            />
          </label>
          <label className="repair-field">
            Display order
            <input
              type="number"
              name="sortOrder"
              defaultValue={reel?.sortOrder ?? 0}
              required
              min={0}
              max={9999}
              step={1}
            />
          </label>
          <p>Lower numbers appear first. Newer reels appear first when numbers match.</p>
          <label className="reels-visibility">
            <input type="checkbox" name="active" defaultChecked={reel?.active ?? true} /> Show on
            website
          </label>
          {error && (
            <p role="alert" className="repair-form-error">
              {error}
            </p>
          )}
          <button className="repair-button" type="submit">
            {mutation.isLoading ? 'Saving…' : 'Save reel'}
          </button>
        </fieldset>
      </form>
      {reel && (
        <div className="reels-admin-preview">
          <button
            className="repair-secondary-button"
            aria-expanded={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Close preview' : 'Preview saved reel'}
          </button>
          {preview && <ReelCard reel={reel} />}
        </div>
      )}
    </section>
  );
}
