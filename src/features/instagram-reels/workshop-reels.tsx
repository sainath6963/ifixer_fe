import { useEffect, useRef, useState } from 'react';
import { useInstagramReelsQuery, type InstagramReel } from './reels-api';

export function ReelCard({ reel }: { reel: InstagramReel }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(660);
  useEffect(() => {
    const resize = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== 'https://www.instagram.com' ||
        event.source !== frame.current?.contentWindow
      )
        return;
      try {
        const data: unknown = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (
          !data ||
          typeof data !== 'object' ||
          !('type' in data) ||
          data.type !== 'MEASURE' ||
          !('details' in data)
        )
          return;
        const details = data.details;
        if (!details || typeof details !== 'object' || !('height' in details)) return;
        const measured = details.height;
        if (
          typeof measured === 'number' &&
          Number.isFinite(measured) &&
          measured >= 300 &&
          measured <= 1800
        )
          setHeight(Math.ceil(measured));
      } catch {
        /* Ignore unrelated or malformed provider messages. */
      }
    };
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);
  const code = /^https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]{5,64})\/$/.exec(reel.url)?.[1];
  if (!code) return null;
  const url = `https://www.instagram.com/reel/${code}/`;
  return (
    <article className="workshop-reel">
      <iframe
        ref={frame}
        style={{ height }}
        src={`${url}embed/`}
        title={reel.title ? `Instagram Reel: ${reel.title}` : `Instagram Reel ${code}`}
        loading="lazy"
        allow="encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="workshop-reel__caption">
        {reel.title && <h3>{reel.title}</h3>}
        <a className="repair-text-link" href={url} target="_blank" rel="noopener noreferrer">
          Watch on Instagram <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}
export function WorkshopReels() {
  const [page, setPage] = useState(1);
  const query = useInstagramReelsQuery(
    { page },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const data = query.data;
  // Optional content must not interrupt booking or show an empty showcase.
  if (!data || query.isError || data.total === 0) return null;
  return (
    <section
      className="repair-section workshop-reels"
      aria-labelledby="workshop-reels-title"
      id="workshop-reels"
      aria-busy={query.isFetching}
    >
      <header className="repair-section-heading">
        <div>
          <p className="repair-eyebrow">A CLOSER LOOK</p>
          <h2 id="workshop-reels-title">From our workshop.</h2>
        </div>
        <p>Repairs, care tips and moments from iFixer.</p>
      </header>
      <div className="workshop-reels__grid">
        {data.items.map((reel) => (
          <ReelCard key={`${reel.id}:${reel.url}`} reel={reel} />
        ))}
      </div>
      {!data.items.length && <p>No reels on this page. Return to the previous page to see more.</p>}
      <p className="workshop-reels__help">
        If a video is unavailable here, use its Instagram link.
      </p>
      {(data.totalPages > 1 || page > 1) && (
        <nav className="stock-pager" aria-label="Workshop reel pages">
          <button disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>
            Previous reels
          </button>
          <span>
            Page {page} of {Math.max(1, data.totalPages)}
          </span>
          <button
            disabled={page >= data.totalPages || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Next reels
          </button>
        </nav>
      )}
    </section>
  );
}
