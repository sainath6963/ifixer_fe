import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import { ProductCard } from '@/app/components/product-card';
import {
  useCancelStockAlertMutation,
  useGetStockAlertsQuery,
  useGetWishlistQuery,
  useRemoveWishlistItemMutation,
} from '@/features/wishlist/wishlist-api';
import { apiErrorMessage } from '@/shared/commerce';

const pageLimit = 12;

export function Component() {
  const [params, setParams] = useSearchParams();
  const parsedPage = Number(params.get('page'));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const wishlist = useGetWishlistQuery({ page, limit: pageLimit });
  const alerts = useGetStockAlertsQuery();
  const [remove, removeState] = useRemoveWishlistItemMutation();
  const [cancelAlert, cancelState] = useCancelStockAlertMutation();
  const [activeId, setActiveId] = useState('');
  const [error, setError] = useState('');

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next);
  }

  async function removeProduct(productId: string) {
    setActiveId(productId);
    setError('');
    try {
      await remove(productId).unwrap();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'This item could not be removed.'));
    } finally {
      setActiveId('');
    }
  }

  async function cancel(productId: string, variantId: string) {
    setActiveId(variantId);
    setError('');
    try {
      await cancelAlert({ productId, variantId }).unwrap();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'This stock alert could not be cancelled.'));
    } finally {
      setActiveId('');
    }
  }

  return (
    <section className="wishlist-page">
      <PageMeta title="Your wishlist" description="Your saved iFixer pieces." noIndex />
      <header className="wishlist-hero">
        <div>
          <p className="eyebrow">Your account / Wishlist</p>
          <h1>Saved for later.</h1>
          <p>Keep the pieces you are considering and track sold-out options.</p>
        </div>
        <Link className="text-link" to="/account">
          Back to account
        </Link>
      </header>

      {error ? (
        <p className="auth-message" role="alert">
          {error}
        </p>
      ) : null}
      {wishlist.isLoading ? <p className="wishlist-empty">Loading your wishlist…</p> : null}
      {wishlist.isError ? (
        <InlineError
          message="Your wishlist could not be loaded."
          onRetry={() => void wishlist.refetch()}
        />
      ) : null}
      {wishlist.data?.items.length ? (
        <div className="wishlist-grid product-grid">
          {wishlist.data.items.map(({ product, addedAt }) => (
            <div className="wishlist-item" key={product.id}>
              <ProductCard product={product} />
              <div className="wishlist-item__actions">
                <time dateTime={addedAt}>
                  Saved{' '}
                  {new Date(addedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </time>
                <button
                  type="button"
                  disabled={removeState.isLoading && activeId === product.id}
                  onClick={() => void removeProduct(product.id)}
                >
                  {removeState.isLoading && activeId === product.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {wishlist.data && wishlist.data.total === 0 ? (
        <div className="wishlist-empty">
          <p className="eyebrow">Nothing saved yet</p>
          <h2>Your next favourite piece can live here.</h2>
          <Link className="button button--dark" to="/catalog">
            Explore the collection
          </Link>
        </div>
      ) : null}
      {wishlist.data && wishlist.data.totalPages > 1 ? (
        <nav className="pagination" aria-label="Wishlist pages">
          <button
            type="button"
            disabled={page <= 1 || wishlist.isFetching}
            onClick={() => changePage(page - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {wishlist.data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= wishlist.data.totalPages || wishlist.isFetching}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}

      <section className="wishlist-alerts" aria-labelledby="stock-alert-heading">
        <div>
          <p className="eyebrow">Back-in-stock email</p>
          <h2 id="stock-alert-heading">Active alerts</h2>
        </div>
        {alerts.isLoading ? <p>Loading alerts…</p> : null}
        {alerts.isError ? (
          <InlineError
            message="Your stock alerts could not be loaded."
            onRetry={() => void alerts.refetch()}
          />
        ) : null}
        {alerts.data?.alerts.map((alert) => (
          <article key={alert.id}>
            <div>
              <Link to={`/products/${alert.productSlug}`}>{alert.productName}</Link>
              <span>
                {alert.variantTitle} · {alert.sku}
              </span>
            </div>
            <time dateTime={alert.requestedAt}>
              Requested {new Date(alert.requestedAt).toLocaleDateString('en-IN')}
            </time>
            <button
              type="button"
              disabled={cancelState.isLoading && activeId === alert.variantId}
              onClick={() => void cancel(alert.productId, alert.variantId)}
            >
              {cancelState.isLoading && activeId === alert.variantId
                ? 'Cancelling…'
                : 'Cancel alert'}
            </button>
          </article>
        ))}
        {alerts.data && alerts.data.alerts.length === 0 ? (
          <p className="wishlist-alerts__empty">You have no active stock alerts.</p>
        ) : null}
      </section>
    </section>
  );
}
