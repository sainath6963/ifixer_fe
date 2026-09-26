import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import { AdminPagination } from '@/features/admin/admin-pagination';
import {
  useGetAdminProductReviewsQuery,
  useModerateProductReviewMutation,
} from '@/features/product-reviews/product-review-api';
import type {
  AdminProductReview,
  ProductReviewStatus,
} from '@/features/product-reviews/product-review.types';
import { apiErrorMessage } from '@/shared/commerce';

const pageLimit = 20;
const statuses: Array<ProductReviewStatus | ''> = [
  '',
  'PENDING',
  'PUBLISHED',
  'REJECTED',
  'WITHDRAWN',
];

function stars(rating: number): string {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

function statusLabel(status: ProductReviewStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const statusValue = params.get('status') ?? '';
  const status =
    statusValue && statuses.includes(statusValue as ProductReviewStatus)
      ? (statusValue as ProductReviewStatus)
      : undefined;
  const ratingValue = Number(params.get('rating'));
  const rating =
    Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : undefined;
  const reviews = useGetAdminProductReviewsQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
    status,
    rating,
  });
  const [moderate, moderationState] = useModerateProductReviewMutation();
  const [rejecting, setRejecting] = useState<AdminProductReview>();
  const [actionId, setActionId] = useState<string>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateParam(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete('page');
    setParams(next);
  }

  async function publish(review: AdminProductReview) {
    setActionId(review.id);
    setMessage('');
    setError('');
    try {
      await moderate({
        reviewId: review.id,
        productId: review.productId,
        expectedVersion: review.version,
        status: 'PUBLISHED',
      }).unwrap();
      setMessage(`Review for ${review.productName} is now published.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Review could not be published.'));
    } finally {
      setActionId(undefined);
    }
  }

  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejecting) return;
    const data = new FormData(event.currentTarget);
    const rejectionReasonValue = data.get('rejectionReason');
    const rejectionReason =
      typeof rejectionReasonValue === 'string' ? rejectionReasonValue.trim() : '';
    setActionId(rejecting.id);
    setMessage('');
    setError('');
    try {
      await moderate({
        reviewId: rejecting.id,
        productId: rejecting.productId,
        expectedVersion: rejecting.version,
        status: 'REJECTED',
        rejectionReason,
      }).unwrap();
      setMessage(`Review for ${rejecting.productName} was returned for revision.`);
      setRejecting(undefined);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Review could not be rejected.'));
    } finally {
      setActionId(undefined);
    }
  }

  return (
    <section className="admin-page admin-reviews-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Community trust</p>
          <h1>Product reviews</h1>
          <p>Moderate verified-buyer feedback before it appears on the storefront.</p>
        </div>
      </header>

      {message ? (
        <p className="admin-alert admin-alert--success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-toolbar review-admin-toolbar">
        <label>
          <span>Search reviews</span>
          <input
            type="search"
            value={search}
            placeholder="Product, order, customer or title"
            onChange={(event) => updateParam('search', event.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {statusLabel(value as ProductReviewStatus)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rating</span>
          <select
            value={rating ?? ''}
            onChange={(event) => updateParam('rating', event.target.value)}
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} stars
              </option>
            ))}
          </select>
        </label>
      </div>

      {rejecting ? (
        <form className="admin-form review-rejection-form" onSubmit={(event) => void reject(event)}>
          <div>
            <p className="eyebrow">Customer-facing feedback</p>
            <h2>Return “{rejecting.title}” for revision</h2>
          </div>
          <label>
            <span>Rejection reason</span>
            <textarea name="rejectionReason" minLength={3} maxLength={1000} rows={4} required />
          </label>
          <div className="admin-page-actions">
            <button
              className="button button--dark"
              type="submit"
              disabled={moderationState.isLoading}
            >
              Send feedback
            </button>
            <button type="button" onClick={() => setRejecting(undefined)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {reviews.isError ? (
        <InlineError
          message="The review queue could not be loaded."
          onRetry={() => void reviews.refetch()}
        />
      ) : null}
      {reviews.isLoading ? <p className="admin-empty">Loading review queue…</p> : null}
      <div className="admin-review-list">
        {reviews.data?.items.map((review) => (
          <article className="admin-review-card" key={review.id}>
            <header>
              <div>
                <span className="admin-badge" data-status={review.status}>
                  {statusLabel(review.status)}
                </span>
                <p className="admin-review-card__stars" aria-label={`${review.rating} out of 5`}>
                  {stars(review.rating)}
                </p>
              </div>
              <time dateTime={review.updatedAt}>
                {new Date(review.updatedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
            </header>
            <h2>{review.title}</h2>
            <p className="admin-review-card__body">{review.body}</p>
            <dl>
              <div>
                <dt>Product</dt>
                <dd>
                  <Link to={`/products/${review.productSlug}`}>{review.productName} ↗</Link>
                </dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{review.displayName}</dd>
              </div>
              <div>
                <dt>Verified order</dt>
                <dd>
                  <Link to={`/admin/orders/${review.orderNumber}`}>{review.orderNumber}</Link>
                </dd>
              </div>
            </dl>
            {review.rejectionReason ? (
              <p className="admin-review-card__feedback">
                <strong>Feedback:</strong> {review.rejectionReason}
              </p>
            ) : null}
            {review.status !== 'WITHDRAWN' ? (
              <footer>
                {review.status !== 'PUBLISHED' ? (
                  <button
                    className="button button--dark"
                    type="button"
                    disabled={actionId === review.id}
                    onClick={() => void publish(review)}
                  >
                    Publish
                  </button>
                ) : null}
                {review.status !== 'REJECTED' ? (
                  <button
                    type="button"
                    disabled={actionId === review.id}
                    onClick={() => setRejecting(review)}
                  >
                    Reject with feedback
                  </button>
                ) : null}
              </footer>
            ) : null}
          </article>
        ))}
      </div>
      {reviews.data && reviews.data.total === 0 ? (
        <p className="admin-empty">No reviews match these filters.</p>
      ) : null}
      {reviews.data ? (
        <AdminPagination
          page={reviews.data.page}
          totalPages={reviews.data.totalPages}
          total={reviews.data.total}
          limit={reviews.data.limit}
          disabled={reviews.isFetching}
          onPageChange={(nextPage) => updateParam('page', String(nextPage), false)}
        />
      ) : null}
    </section>
  );
}
