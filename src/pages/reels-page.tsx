import { useState } from 'react';
import { Link } from 'react-router-dom';

import { PageMeta } from '@/app/components/page-meta';
import { useInstagramReelsQuery } from '@/features/instagram-reels/reels-api';
import { ReelCard } from '@/features/instagram-reels/workshop-reels';

const reelsPerPage = 100;

export function Component() {
  const [page, setPage] = useState(1);
  const query = useInstagramReelsQuery(
    { page, limit: reelsPerPage },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const data = query.data;

  return (
    <>
      <PageMeta
        socialPreview
        title="Workshop reels"
        description="Watch mobile repair work, care tips and workshop moments from iFixer."
      />
      <section className="repair-page-heading">
        <p className="repair-eyebrow">FROM THE WORKSHOP</p>
        <h1>
          All our <em>reels.</em>
        </h1>
        <p>Mobile repairs, practical care tips and everyday moments from the iFixer workshop.</p>
        <Link className="repair-button" to="/#workshop-reels">
          Back to home <span aria-hidden="true">↙</span>
        </Link>
      </section>
      <section
        className="repair-section reels-page"
        aria-labelledby="all-reels-title"
        aria-busy={query.isFetching}
      >
        <header className="reels-page__heading">
          <h2 id="all-reels-title">Workshop videos</h2>
          {data && data.total > 0 && (
            <p>
              {data.total} {data.total === 1 ? 'reel' : 'reels'}
            </p>
          )}
        </header>
        {query.isLoading && <p role="status">Loading workshop reels…</p>}
        {query.isError && (
          <p role="alert" className="repair-form-error">
            Workshop reels could not load.{' '}
            <button className="repair-text-link" onClick={() => void query.refetch()}>
              Try again
            </button>
          </p>
        )}
        {data && !query.isError && data.total === 0 && (
          <p>New workshop reels will appear here when they are published.</p>
        )}
        {data && data.items.length > 0 && (
          <div className="workshop-reels__grid">
            {data.items.map((reel) => (
              <ReelCard key={`${reel.id}:${reel.url}`} reel={reel} />
            ))}
          </div>
        )}
        {data && data.totalPages > 1 && (
          <nav className="stock-pager reels-page__pager" aria-label="Workshop reel pages">
            <button
              className="repair-secondary-button"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous reels
            </button>
            <span>
              Page {page} of {data.totalPages}
            </span>
            <button
              className="repair-secondary-button"
              disabled={page >= data.totalPages || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next reels
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
