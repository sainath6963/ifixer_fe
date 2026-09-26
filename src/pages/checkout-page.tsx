import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import { useGetCartQuery } from '@/features/cart/cart-api';
import {
  useCreateOrderMutation,
  usePreviewCheckoutMutation,
} from '@/features/checkout/checkout-api';
import { createIdempotencyKey } from '@/features/checkout/idempotency';
import type { ShippingAddress } from '@/features/checkout/checkout.types';
import { useGetCustomerAddressBookQuery } from '@/features/customer-addresses/customer-address-api';
import type { SavedCustomerAddress } from '@/features/customer-addresses/customer-address.types';
import { apiErrorMessage, formatPrice, resolveMediaUrl } from '@/shared/commerce';

interface AddressFormState {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

function addressForm(address: SavedCustomerAddress): AddressFormState {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
  };
}

export function Component() {
  const navigate = useNavigate();
  const cartQuery = useGetCartQuery();
  const addressBook = useGetCustomerAddressBookQuery();
  const [previewCheckout, previewState] = usePreviewCheckoutMutation();
  const [createOrder, createState] = useCreateOrderMutation();
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey('checkout'));
  const [form, setForm] = useState<AddressFormState>();
  const [selectedAddressId, setSelectedAddressId] = useState('manual');
  const [couponCode, setCouponCode] = useState('');
  const [formError, setFormError] = useState('');
  const cart = cartQuery.data?.cart;
  const preview = previewState.data?.preview;
  const metadata = (
    <PageMeta title="Secure checkout" description="Complete your iFixer order." noIndex />
  );
  const defaultAddress = addressBook.data?.addresses.find((address) => address.isDefault);
  const activeForm: AddressFormState =
    form ??
    (defaultAddress
      ? addressForm(defaultAddress)
      : {
          fullName: '',
          phone: '+91',
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
        });
  const activeAddressId = form ? selectedAddressId : (defaultAddress?.id ?? 'manual');

  function resetReview() {
    previewState.reset();
    setIdempotencyKey(createIdempotencyKey('checkout'));
    setFormError('');
  }

  function updateField(field: keyof AddressFormState, value: string) {
    setSelectedAddressId('manual');
    setForm((current) => ({ ...(current ?? activeForm), [field]: value }));
    resetReview();
  }

  function selectSavedAddress(addressId: string) {
    setSelectedAddressId(addressId);
    const address = addressBook.data?.addresses.find((item) => item.id === addressId);
    setForm(address ? addressForm(address) : activeForm);
    resetReview();
  }

  function shippingAddress(): ShippingAddress {
    const line2 = activeForm.line2.trim();
    return {
      fullName: activeForm.fullName.trim(),
      phone: activeForm.phone.trim(),
      line1: activeForm.line1.trim(),
      ...(line2 ? { line2 } : {}),
      city: activeForm.city.trim(),
      state: activeForm.state.trim(),
      postalCode: activeForm.postalCode.trim(),
      countryCode: 'IN',
    };
  }

  async function requestPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart) return;
    setFormError('');
    try {
      await previewCheckout({
        expectedCartVersion: cart.version,
        shippingAddress: shippingAddress(),
        ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
      }).unwrap();
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Checkout could not be prepared. Please retry.'));
    }
  }

  async function reserveOrder() {
    if (!preview) return;
    setFormError('');
    try {
      const { order } = await createOrder({
        expectedCartVersion: preview.cart.version,
        shippingAddress: preview.shippingAddress,
        ...(preview.coupon ? { couponCode: preview.coupon.code } : {}),
        idempotencyKey,
      }).unwrap();
      await navigate(`/orders/${order.orderNumber}`, {
        replace: true,
        state: { created: true },
      });
    } catch (error) {
      setFormError(
        apiErrorMessage(error, 'The order could not be reserved. Retry without changing the page.'),
      );
    }
  }

  if (cartQuery.isLoading) {
    return (
      <section className="checkout-page checkout-page--loading" aria-busy="true">
        {metadata}
        <p className="eyebrow">Secure checkout</p>
        <h1>Preparing checkout…</h1>
      </section>
    );
  }

  if (cartQuery.isError) {
    return (
      <section className="checkout-page">
        {metadata}
        <InlineError
          message="Your bag could not be loaded for checkout."
          onRetry={() => void cartQuery.refetch()}
        />
      </section>
    );
  }

  if (!cart?.items.length) {
    return (
      <section className="cart-empty">
        {metadata}
        <p className="eyebrow">Checkout</p>
        <h1>Your bag is empty.</h1>
        <Link className="button button--dark" to="/catalog">
          Explore the collection
        </Link>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      {metadata}
      <header className="checkout-header">
        <p className="eyebrow">Secure checkout</p>
        <h1>Delivery details</h1>
        <p>
          Payment opens only after your current prices, stock and delivery details are confirmed.
        </p>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={(event) => void requestPreview(event)}>
          <div className="checkout-step-heading">
            <span>01</span>
            <div>
              <p className="eyebrow">Shipping</p>
              <h2>Where should we send it?</h2>
            </div>
          </div>

          {addressBook.data?.addresses.length ? (
            <div className="checkout-saved-addresses">
              <label>
                <span>Saved delivery address</span>
                <select
                  value={activeAddressId}
                  onChange={(event) => selectSavedAddress(event.target.value)}
                >
                  {addressBook.data.addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label}
                      {address.isDefault ? ' — Default' : ''}
                    </option>
                  ))}
                  <option value="manual">Use different details</option>
                </select>
              </label>
              <Link to="/account">Manage addresses</Link>
            </div>
          ) : null}

          <div className="checkout-fields">
            <label className="field--wide">
              <span>Full name</span>
              <input
                value={activeForm.fullName}
                minLength={1}
                maxLength={120}
                autoComplete="name"
                required
                onChange={(event) => updateField('fullName', event.target.value)}
              />
            </label>
            <label className="field--wide">
              <span>Mobile number</span>
              <input
                type="tel"
                value={activeForm.phone}
                pattern="\+?[1-9]\d{7,14}"
                maxLength={16}
                autoComplete="tel"
                inputMode="tel"
                required
                onChange={(event) => updateField('phone', event.target.value)}
              />
            </label>
            <label className="field--wide">
              <span>Address line 1</span>
              <input
                value={activeForm.line1}
                maxLength={200}
                autoComplete="address-line1"
                required
                onChange={(event) => updateField('line1', event.target.value)}
              />
            </label>
            <label className="field--wide">
              <span>Address line 2 (optional)</span>
              <input
                value={activeForm.line2}
                maxLength={200}
                autoComplete="address-line2"
                onChange={(event) => updateField('line2', event.target.value)}
              />
            </label>
            <label>
              <span>City</span>
              <input
                value={activeForm.city}
                maxLength={100}
                autoComplete="address-level2"
                required
                onChange={(event) => updateField('city', event.target.value)}
              />
            </label>
            <label>
              <span>State</span>
              <input
                value={activeForm.state}
                maxLength={100}
                autoComplete="address-level1"
                required
                onChange={(event) => updateField('state', event.target.value)}
              />
            </label>
            <label>
              <span>PIN code</span>
              <input
                value={activeForm.postalCode}
                pattern="\d{6}"
                maxLength={6}
                autoComplete="postal-code"
                inputMode="numeric"
                required
                onChange={(event) => updateField('postalCode', event.target.value)}
              />
            </label>
            <label>
              <span>Country</span>
              <input value="India" readOnly aria-readonly="true" />
            </label>
          </div>

          <div className="checkout-coupon">
            <label>
              <span>Promotion code (optional)</span>
              <input
                value={couponCode}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
                autoComplete="off"
                placeholder="WELCOME10"
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase());
                  resetReview();
                }}
              />
            </label>
            <p>Codes are validated against the current bag when you review the order.</p>
          </div>

          <button
            className="button button--dark checkout-form__submit"
            type="submit"
            disabled={previewState.isLoading}
          >
            {previewState.isLoading
              ? 'Checking your bag…'
              : preview
                ? 'Refresh order review'
                : 'Review order'}
          </button>
        </form>

        <aside className="checkout-bag" aria-labelledby="checkout-bag-title">
          <p className="eyebrow">Your bag / {cart.totalQuantity}</p>
          <h2 id="checkout-bag-title">Order summary</h2>
          <div className="checkout-bag__items">
            {cart.items.map((item) => (
              <div className="checkout-bag__item" key={item.variantId}>
                <div>
                  {item.primaryImage ? (
                    <img src={resolveMediaUrl(item.primaryImage.sources.thumbnail)} alt="" />
                  ) : (
                    <span aria-hidden="true">RC</span>
                  )}
                  <small>{item.quantity}</small>
                </div>
                <p>
                  <strong>{item.productName}</strong>
                  <span>{item.variantTitle}</span>
                </p>
                <span>{formatPrice(item.lineTotalInPaise ?? 0)}</span>
              </div>
            ))}
          </div>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(preview?.totals.subtotalInPaise ?? cart.subtotalInPaise)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>
                {preview ? formatPrice(preview.totals.shippingInPaise) : 'Confirmed at review'}
              </dd>
            </div>
            {preview?.coupon ? (
              <div className="checkout-bag__discount">
                <dt>Coupon · {preview.coupon.code}</dt>
                <dd>−{formatPrice(preview.totals.couponDiscountInPaise)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Tax</dt>
              <dd>{preview ? formatPrice(preview.totals.taxInPaise) : 'Confirmed at review'}</dd>
            </div>
          </dl>
          <div className="checkout-bag__total">
            <span>Total</span>
            <strong>
              {formatPrice(preview?.totals.grandTotalInPaise ?? cart.subtotalInPaise)}
            </strong>
          </div>
        </aside>
      </div>

      {formError ? (
        <p className="auth-message checkout-error" role="alert">
          {formError}
        </p>
      ) : null}

      {preview ? (
        <section className="checkout-review" aria-labelledby="checkout-review-title">
          <div className="checkout-step-heading">
            <span>02</span>
            <div>
              <p className="eyebrow">Review</p>
              <h2 id="checkout-review-title">Ready to reserve</h2>
            </div>
          </div>
          <div className="checkout-review__details">
            <address>
              <strong>{preview.shippingAddress.fullName}</strong>
              <span>{preview.shippingAddress.line1}</span>
              {preview.shippingAddress.line2 ? <span>{preview.shippingAddress.line2}</span> : null}
              <span>
                {preview.shippingAddress.city}, {preview.shippingAddress.state}{' '}
                {preview.shippingAddress.postalCode}
              </span>
              <span>{preview.shippingAddress.phone}</span>
            </address>
            <div>
              <p>
                Inventory will be reserved for approximately {preview.reservationMinutes} minutes
                while payment is completed.
              </p>
              {preview.coupon ? (
                <p className="checkout-review__coupon" role="status">
                  {preview.coupon.code} applied — you save{' '}
                  {formatPrice(preview.coupon.discountInPaise)}.
                </p>
              ) : null}
              <button
                className="button button--dark"
                type="button"
                disabled={!preview.readyToCreateOrder || createState.isLoading}
                onClick={() => void reserveOrder()}
              >
                {createState.isLoading ? 'Reserving order…' : 'Reserve order and continue'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
