import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import type { ProductDetailView } from '@/features/catalog/catalog.types';
import { apiErrorMessage } from '@/shared/commerce';

import {
  useAddWishlistItemMutation,
  useCancelStockAlertMutation,
  useGetProductStockAlertStateQuery,
  useGetWishlistMembershipQuery,
  useRemoveWishlistItemMutation,
  useSubscribeStockAlertMutation,
} from './wishlist-api';

export function ProductSaveActions({ product }: { product: ProductDetailView }) {
  const customerStatus = useAppSelector((state) => state.session.customerStatus);
  const authenticated = customerStatus === 'authenticated';
  const soldOutVariants = product.variants.filter(
    (variant) => variant.availability === 'OUT_OF_STOCK',
  );
  const membership = useGetWishlistMembershipQuery(product.id, { skip: !authenticated });
  const alertState = useGetProductStockAlertStateQuery(product.id, {
    skip: !authenticated || soldOutVariants.length === 0,
  });
  const [addWishlist, addState] = useAddWishlistItemMutation();
  const [removeWishlist, removeState] = useRemoveWishlistItemMutation();
  const [subscribe, subscribeState] = useSubscribeStockAlertMutation();
  const [cancel, cancelState] = useCancelStockAlertMutation();
  const [activeVariantAction, setActiveVariantAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const returnTo = `/products/${product.slug}`;
  const wishlisted = membership.data?.wishlisted ?? false;
  const productAlertState = alertState.data;
  const wishlistBusy = addState.isLoading || removeState.isLoading;

  async function toggleWishlist() {
    setMessage('');
    setError('');
    try {
      if (wishlisted) {
        await removeWishlist(product.id).unwrap();
        setMessage('Removed from your wishlist.');
      } else {
        await addWishlist(product.id).unwrap();
        setMessage('Saved to your wishlist.');
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Your wishlist could not be updated.'));
    }
  }

  async function toggleAlert(variantId: string, active: boolean) {
    setActiveVariantAction(variantId);
    setMessage('');
    setError('');
    try {
      if (active) {
        await cancel({ productId: product.id, variantId }).unwrap();
        setMessage('Stock alert cancelled.');
      } else {
        await subscribe({ productId: product.id, variantId }).unwrap();
        setMessage('We will email you when this option is back.');
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'The stock alert could not be updated.'));
    } finally {
      setActiveVariantAction('');
    }
  }

  if (customerStatus === 'unknown') {
    return (
      <div className="product-save-actions product-save-actions--loading">Loading saved items…</div>
    );
  }

  if (!authenticated) {
    return (
      <div className="product-save-actions">
        <Link className="product-save-actions__save" to="/login" state={{ returnTo }}>
          ♡ Save to wishlist
        </Link>
        {soldOutVariants.length ? (
          <p>
            <Link to="/login" state={{ returnTo }}>
              Sign in
            </Link>{' '}
            with a verified email to request back-in-stock alerts.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="product-save-actions">
      <button
        className="product-save-actions__save"
        type="button"
        aria-pressed={wishlisted}
        disabled={wishlistBusy || membership.isLoading}
        onClick={() => void toggleWishlist()}
      >
        {wishlisted ? '♥ Saved to wishlist' : '♡ Save to wishlist'}
      </button>

      {soldOutVariants.length ? (
        <div className="stock-alert-options">
          <div>
            <strong>Waiting for an option?</strong>
            <span>We send one email when it returns. Stock is not reserved.</span>
          </div>
          {alertState.isError ? (
            <p className="form-notice" role="alert">
              Stock-alert status could not be loaded.
            </p>
          ) : null}
          {!alertState.isLoading && productAlertState && !productAlertState.emailEligible ? (
            <p className="stock-alert-options__verification">
              {productAlertState.emailEligibilityReason} <Link to="/account">Verify email</Link>
            </p>
          ) : null}
          {productAlertState?.emailEligible
            ? soldOutVariants.map((variant) => {
                const active = productAlertState.activeVariantIds.includes(variant.variantId);
                const busy =
                  activeVariantAction === variant.variantId &&
                  (subscribeState.isLoading || cancelState.isLoading);
                return (
                  <button
                    type="button"
                    className="stock-alert-option"
                    key={variant.variantId}
                    aria-pressed={active}
                    disabled={busy}
                    onClick={() => void toggleAlert(variant.variantId, active)}
                  >
                    <span>{variant.title}</span>
                    <strong>{busy ? 'Updating…' : active ? 'Alert active' : 'Notify me'}</strong>
                  </button>
                );
              })
            : null}
        </div>
      ) : null}

      {message ? (
        <p className="form-notice form-notice--success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-notice" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
