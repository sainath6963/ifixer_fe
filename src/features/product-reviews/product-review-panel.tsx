import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import { apiErrorMessage } from '@/shared/commerce';

import {
  useCreateProductReviewMutation,
  useGetCustomerReviewEligibilityQuery,
  useGetProductReviewsQuery,
  useUpdateProductReviewMutation,
  useWithdrawProductReviewMutation,
} from './product-review-api';

function stars(rating: number): string {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

function reviewStatus(status: string): string {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'REJECTED') return 'Needs revision';
  if (status === 'WITHDRAWN') return 'Withdrawn';
  return 'Awaiting moderation';
}

export function ProductReviewPanel({ productId }: { productId: string }) {
  const customerStatus = useAppSelector((state) => state.session.customerStatus);
  const [page, setPage] = useState(1);
  const publicReviews = useGetProductReviewsQuery({ productId, page, limit: 6 });
  const eligibility = useGetCustomerReviewEligibilityQuery(productId, {
    skip: customerStatus !== 'authenticated',
  });
  const [createReview, createState] = useCreateProductReviewMutation();
  const [updateReview, updateState] = useUpdateProductReviewMutation();
  const [withdrawReview, withdrawState] = useWithdrawProductReviewMutation();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const existing = eligibility.data?.review;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rating = Number(data.get('rating'));
    const titleValue = data.get('title');
    const bodyValue = data.get('body');
    const title = typeof titleValue === 'string' ? titleValue.trim() : '';
    const body = typeof bodyValue === 'string' ? bodyValue.trim() : '';
    setNotice('');
    setError('');
    try {
      if (existing) {
        await updateReview({
          reviewId: existing.id,
          productId,
          expectedVersion: existing.version,
          rating,
          title,
          body,
        }).unwrap();
        setNotice('Your revised review is awaiting moderation.');
      } else {
        await createReview({ productId, rating, title, body }).unwrap();
        setNotice('Thanks — your verified review is awaiting moderation.');
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Your review could not be saved.'));
    }
  }

  async function withdraw() {
    if (!existing) return;
    setNotice('');
    setError('');
    try {
      await withdrawReview({
        reviewId: existing.id,
        productId,
        expectedVersion: existing.version,
      }).unwrap();
      setNotice('Your review has been withdrawn.');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Your review could not be withdrawn.'));
    }
  }

  const summary = publicReviews.data?.summary;
  const saving = createState.isLoading || updateState.isLoading;

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <header className="product-reviews__header">
        <div>
          <p className="eyebrow">From the community</p>
          <h2 id="product-reviews-title">Verified buyer reviews</h2>
        </div>
        <div
          className="product-reviews__score"
          aria-label={`${summary?.averageRating ?? 0} out of 5`}
        >
          <strong>{summary?.reviewCount ? summary.averageRating.toFixed(1) : '—'}</strong>
          <span>
            {summary?.reviewCount ? stars(Math.round(summary.averageRating)) : 'No ratings yet'}
          </span>
          <small>{summary?.reviewCount ?? 0} reviews</small>
        </div>
      </header>

      {customerStatus === 'anonymous' ? (
        <p className="review-callout">
          Bought this piece? <Link to="/login">Sign in</Link> to leave a verified review after
          delivery.
        </p>
      ) : null}

      {customerStatus === 'authenticated' && eligibility.isLoading ? (
        <p className="review-callout">Checking your purchase…</p>
      ) : null}

      {customerStatus === 'authenticated' && eligibility.data?.eligible ? (
        <form
          key={existing ? `${existing.id}:${existing.version}` : 'new-review'}
          className="review-form"
          onSubmit={(event) => void submit(event)}
        >
          <div className="review-form__heading">
            <div>
              <h3>{existing ? 'Your review' : 'Share your experience'}</h3>
              <p>
                Verified order {eligibility.data.deliveredOrderNumber}. Reviews are checked before
                publication.
              </p>
            </div>
            {existing ? (
              <span className={`review-status review-status--${existing.status.toLowerCase()}`}>
                {reviewStatus(existing.status)}
              </span>
            ) : null}
          </div>
          {existing?.rejectionReason ? (
            <p className="review-form__feedback">
              <strong>Moderator feedback:</strong> {existing.rejectionReason}
            </p>
          ) : null}
          <div className="review-form__fields">
            <label>
              <span>Rating</span>
              <select name="rating" defaultValue={existing?.rating ?? 5}>
                <option value={5}>5 — Exceptional</option>
                <option value={4}>4 — Very good</option>
                <option value={3}>3 — Good</option>
                <option value={2}>2 — Fair</option>
                <option value={1}>1 — Disappointing</option>
              </select>
            </label>
            <label>
              <span>Review title</span>
              <input
                name="title"
                defaultValue={existing?.title ?? ''}
                minLength={3}
                maxLength={120}
                required
              />
            </label>
            <label className="review-form__body">
              <span>Your experience</span>
              <textarea
                name="body"
                defaultValue={existing?.body ?? ''}
                minLength={10}
                maxLength={2000}
                rows={5}
                required
              />
            </label>
          </div>
          <div className="review-form__actions">
            <button className="button button--dark" type="submit" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save and resubmit' : 'Submit review'}
            </button>
            {existing && existing.status !== 'WITHDRAWN' ? (
              <button
                type="button"
                disabled={withdrawState.isLoading}
                onClick={() => void withdraw()}
              >
                {withdrawState.isLoading ? 'Withdrawing…' : 'Withdraw review'}
              </button>
            ) : null}
          </div>
          {notice ? (
            <p className="form-notice" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="form-notice form-notice--error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {customerStatus === 'authenticated' && eligibility.data && !eligibility.data.eligible ? (
        <p className="review-callout">{eligibility.data.reason}</p>
      ) : null}

      {publicReviews.isError ? (
        <InlineError
          message="Reviews could not be loaded."
          onRetry={() => void publicReviews.refetch()}
        />
      ) : null}
      <div className="review-grid" aria-live="polite">
        {publicReviews.data?.items.map((review) => (
          <article className="review-card" key={review.id}>
            <p className="review-card__stars" aria-label={`${review.rating} out of 5`}>
              {stars(review.rating)}
            </p>
            <h3>{review.title}</h3>
            <p>{review.body}</p>
            <footer>
              <strong>{review.displayName}</strong>
              <span>Verified purchase</span>
              <time dateTime={review.publishedAt}>
                {new Date(review.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </time>
            </footer>
          </article>
        ))}
      </div>
      {publicReviews.data && publicReviews.data.totalPages > 1 ? (
        <nav className="review-pagination" aria-label="Review pages">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {publicReviews.data.totalPages}
          </span>
          <button
            type="button"
            disabled={page === publicReviews.data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
