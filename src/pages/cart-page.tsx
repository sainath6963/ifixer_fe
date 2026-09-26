import { useState } from 'react';
import { Link } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import {
  useClearCartMutation,
  useGetCartQuery,
  useRemoveCartItemMutation,
  useSetCartItemMutation,
} from '@/features/cart/cart-api';
import type { CartItemView } from '@/features/cart/cart.types';
import { apiErrorMessage, formatPrice, resolveMediaUrl } from '@/shared/commerce';

export function Component() {
  const cartQuery = useGetCartQuery();
  const [setCartItem] = useSetCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const [clearCart, clearState] = useClearCartMutation();
  const [activeVariant, setActiveVariant] = useState<string>();
  const [errorMessage, setErrorMessage] = useState('');
  const cart = cartQuery.data?.cart;
  const metadata = <PageMeta title="Your bag" description="Review your iFixer bag." noIndex />;

  async function updateQuantity(item: CartItemView, quantity: number) {
    if (!cart) return;
    setActiveVariant(item.variantId);
    setErrorMessage('');
    try {
      await setCartItem({
        productId: item.productId,
        variantId: item.variantId,
        quantity,
        expectedVersion: cart.version,
      }).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Your bag could not be updated. Please retry.'));
    } finally {
      setActiveVariant(undefined);
    }
  }

  async function remove(item: CartItemView) {
    if (!cart) return;
    setActiveVariant(item.variantId);
    setErrorMessage('');
    try {
      await removeCartItem({ variantId: item.variantId, expectedVersion: cart.version }).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'This item could not be removed. Please retry.'));
    } finally {
      setActiveVariant(undefined);
    }
  }

  async function clear() {
    if (!cart) return;
    setErrorMessage('');
    try {
      await clearCart({ expectedVersion: cart.version }).unwrap();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Your bag could not be cleared. Please retry.'));
    }
  }

  if (cartQuery.isLoading) {
    return (
      <section className="cart-page cart-page--loading" aria-busy="true">
        {metadata}
        <p className="eyebrow">Your bag</p>
        <h1>Gathering your pieces…</h1>
      </section>
    );
  }

  if (cartQuery.isError) {
    return (
      <section className="cart-page">
        {metadata}
        <header className="page-intro page-intro--compact">
          <p className="eyebrow">Your bag</p>
          <h1>We could not open your bag.</h1>
        </header>
        <InlineError
          message="Please check your connection and try again."
          onRetry={() => void cartQuery.refetch()}
        />
      </section>
    );
  }

  if (!cart?.items.length) {
    return (
      <section className="cart-empty">
        {metadata}
        <p className="eyebrow">Your bag / 0</p>
        <h1>A little room for something remarkable.</h1>
        <p>Your selected iFixer pieces will appear here.</p>
        <Link className="button button--dark" to="/catalog">
          Explore the collection
        </Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      {metadata}
      <header className="page-intro page-intro--compact">
        <p className="eyebrow">Your bag / {cart.totalQuantity}</p>
        <h1>Selected pieces</h1>
      </header>

      {errorMessage ? <InlineError message={errorMessage} /> : null}

      <div className="cart-layout">
        <div className="cart-list">
          {cart.items.map((item) => {
            const unavailable = item.availability !== 'AVAILABLE';
            return (
              <article className="cart-item" key={item.variantId}>
                <Link
                  className="cart-item__image"
                  to={item.productSlug ? `/products/${item.productSlug}` : '/catalog'}
                  aria-label={`View ${item.productName ?? 'product'}`}
                >
                  {item.primaryImage ? (
                    <img
                      src={resolveMediaUrl(item.primaryImage.sources.thumbnail)}
                      alt={item.primaryImage.altText}
                    />
                  ) : (
                    <span aria-hidden="true">RC</span>
                  )}
                </Link>
                <div className="cart-item__information">
                  <div>
                    <p className="eyebrow">{item.variantTitle ?? item.sku ?? 'iFixer'}</p>
                    <h2>{item.productName ?? 'Unavailable product'}</h2>
                    {item.attributes?.length ? (
                      <p>
                        {item.attributes.map(({ name, value }) => `${name}: ${value}`).join(' / ')}
                      </p>
                    ) : null}
                    {unavailable ? (
                      <p className="cart-item__warning">This selection needs your attention.</p>
                    ) : null}
                  </div>
                  <div className="cart-item__controls">
                    <label>
                      <span>Quantity</span>
                      <select
                        value={item.quantity}
                        disabled={activeVariant === item.variantId || unavailable}
                        onChange={(event) => void updateQuantity(item, Number(event.target.value))}
                      >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="text-button"
                      type="button"
                      disabled={activeVariant === item.variantId}
                      onClick={() => void remove(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="cart-item__price">
                  {item.lineTotalInPaise === undefined
                    ? 'Unavailable'
                    : formatPrice(item.lineTotalInPaise)}
                </p>
              </article>
            );
          })}
          <button
            className="text-button cart-list__clear"
            type="button"
            disabled={clearState.isLoading}
            onClick={() => void clear()}
          >
            {clearState.isLoading ? 'Clearing…' : 'Clear bag'}
          </button>
        </div>

        <aside className="cart-summary" aria-labelledby="summary-title">
          <p className="eyebrow">Order summary</p>
          <h2 id="summary-title">Your total</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(cart.subtotalInPaise)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <div className="cart-summary__total">
            <span>Total</span>
            <strong>{formatPrice(cart.subtotalInPaise)}</strong>
          </div>
          <Link
            className={`button button--dark cart-summary__checkout${cart.readyForCheckout ? '' : ' is-disabled'}`}
            to={cart.readyForCheckout ? '/checkout' : '/cart'}
            aria-disabled={!cart.readyForCheckout}
          >
            Continue to checkout
          </Link>
          <p>Taxes and shipping are confirmed before payment.</p>
        </aside>
      </div>
    </section>
  );
}
