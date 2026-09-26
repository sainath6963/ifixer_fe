import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { useAppSelector } from '@/app/hooks';
import { rupeesToPaise } from '@/features/admin/admin-form-utils';
import { positiveAdminPage } from '@/features/admin/admin-list-state';
import {
  useCreateAdminCouponMutation,
  useGetAdminCouponsQuery,
  useUpdateAdminCouponMutation,
} from '@/features/admin/admin-operations-api';
import { AdminPagination } from '@/features/admin/admin-pagination';
import type { AdminCoupon, CouponDiscountType, CouponStatus } from '@/features/admin/admin.types';
import { apiErrorMessage, formatPrice } from '@/shared/commerce';

const pageLimit = 25;
const statuses: Array<CouponStatus | ''> = ['', 'DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function discountLabel(coupon: AdminCoupon): string {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.percentageOff}%${
      coupon.maximumDiscountInPaise ? ` up to ${formatPrice(coupon.maximumDiscountInPaise)}` : ''
    }`;
  }
  return formatPrice(coupon.fixedAmountInPaise ?? 0);
}

export function Component() {
  const isOwner = useAppSelector((state) => state.session.admin?.roles.includes('OWNER') ?? false);
  const [params, setParams] = useSearchParams();
  const page = positiveAdminPage(params.get('page'));
  const search = params.get('search')?.trim() ?? '';
  const statusValue = params.get('status') ?? '';
  const status =
    statuses.includes(statusValue as CouponStatus) && statusValue
      ? (statusValue as CouponStatus)
      : undefined;
  const coupons = useGetAdminCouponsQuery({
    page,
    limit: pageLimit,
    search: search || undefined,
    status,
  });
  const [createCoupon, createState] = useCreateAdminCouponMutation();
  const [updateCoupon, updateState] = useUpdateAdminCouponMutation();
  const [discountType, setDiscountType] = useState<CouponDiscountType>('PERCENTAGE');
  const [showCreate, setShowCreate] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon>();
  const [editDiscountType, setEditDiscountType] = useState<CouponDiscountType>('PERCENTAGE');
  const [actionId, setActionId] = useState<string>();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const now = new Date();
  const defaultStart = localDateTime(now);
  const defaultEnd = localDateTime(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  function updateParam(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete('page');
    setParams(next);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = formText(data, 'discountValue');
    const minimumSubtotalInPaise = rupeesToPaise(formText(data, 'minimumSubtotal'));
    const maximumDiscountText = formText(data, 'maximumDiscount');
    const maximumDiscountInPaise = maximumDiscountText
      ? rupeesToPaise(maximumDiscountText)
      : undefined;
    const percentageOff = discountType === 'PERCENTAGE' ? Number(amount) : undefined;
    const fixedAmountInPaise = discountType === 'FIXED_AMOUNT' ? rupeesToPaise(amount) : undefined;
    if (
      minimumSubtotalInPaise === undefined ||
      (discountType === 'PERCENTAGE' &&
        (percentageOff === undefined ||
          !Number.isInteger(percentageOff) ||
          percentageOff < 1 ||
          percentageOff > 90)) ||
      (discountType === 'FIXED_AMOUNT' && !fixedAmountInPaise) ||
      (maximumDiscountText && !maximumDiscountInPaise)
    ) {
      setErrorMessage('Check the discount and rupee values before saving.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    try {
      const result = await createCoupon({
        code: formText(data, 'code').toUpperCase(),
        name: formText(data, 'name'),
        description: formText(data, 'description') || undefined,
        discountType,
        percentageOff,
        fixedAmountInPaise,
        maximumDiscountInPaise: discountType === 'PERCENTAGE' ? maximumDiscountInPaise : undefined,
        minimumSubtotalInPaise,
        usageLimit: Number(formText(data, 'usageLimit')),
        startsAt: new Date(formText(data, 'startsAt')).toISOString(),
        endsAt: new Date(formText(data, 'endsAt')).toISOString(),
      }).unwrap();
      setMessage(`${result.coupon.code} was saved as a draft. Review it, then activate it.`);
      setShowCreate(false);
      form.reset();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Coupon could not be created.'));
    }
  }

  async function changeStatus(coupon: AdminCoupon, nextStatus: CouponStatus) {
    setActionId(coupon.id);
    setMessage('');
    setErrorMessage('');
    try {
      const result = await updateCoupon({
        couponId: coupon.id,
        expectedVersion: coupon.version,
        status: nextStatus,
      }).unwrap();
      setMessage(`${result.coupon.code} is now ${result.coupon.status.toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Coupon status could not be updated.'));
    } finally {
      setActionId(undefined);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCoupon) return;
    const data = new FormData(event.currentTarget);
    const termsLocked = editingCoupon.reservedCount + editingCoupon.redeemedCount > 0;
    const minimumSubtotalInPaise = rupeesToPaise(formText(data, 'minimumSubtotal'));
    const maximumText = formText(data, 'maximumDiscount');
    const maximumDiscountInPaise = maximumText ? rupeesToPaise(maximumText) : null;
    const discountValue = formText(data, 'discountValue');
    const percentageOff = editDiscountType === 'PERCENTAGE' ? Number(discountValue) : null;
    const fixedAmountInPaise =
      editDiscountType === 'FIXED_AMOUNT' ? rupeesToPaise(discountValue) : null;
    if (
      minimumSubtotalInPaise === undefined ||
      (maximumText && maximumDiscountInPaise === undefined) ||
      (!termsLocked &&
        ((editDiscountType === 'PERCENTAGE' &&
          (!Number.isInteger(percentageOff) || !percentageOff || percentageOff > 90)) ||
          (editDiscountType === 'FIXED_AMOUNT' && !fixedAmountInPaise)))
    ) {
      setErrorMessage('Check the campaign values before saving.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    try {
      const result = await updateCoupon({
        couponId: editingCoupon.id,
        expectedVersion: editingCoupon.version,
        name: formText(data, 'name'),
        description: formText(data, 'description') || null,
        minimumSubtotalInPaise,
        usageLimit: Number(formText(data, 'usageLimit')),
        startsAt: new Date(formText(data, 'startsAt')).toISOString(),
        endsAt: new Date(formText(data, 'endsAt')).toISOString(),
        ...(!termsLocked
          ? {
              code: formText(data, 'code').toUpperCase(),
              discountType: editDiscountType,
              percentageOff,
              fixedAmountInPaise,
              maximumDiscountInPaise:
                editDiscountType === 'PERCENTAGE' ? maximumDiscountInPaise : null,
            }
          : {}),
      }).unwrap();
      setMessage(`${result.coupon.code} campaign details were updated.`);
      setEditingCoupon(undefined);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Coupon details could not be updated.'));
    }
  }

  return (
    <section className="admin-page admin-promotions-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Revenue operations</p>
          <h1>Promotions</h1>
          <p>
            Schedule coupon codes, enforce usage caps and watch reserved versus paid redemptions.
          </p>
        </div>
        {isOwner ? (
          <div className="admin-page-actions">
            <button type="button" onClick={() => setShowCreate((visible) => !visible)}>
              {showCreate ? 'Close form' : 'New coupon'}
            </button>
          </div>
        ) : null}
      </header>

      {!isOwner ? (
        <p className="admin-alert">Staff access is read-only. An OWNER manages coupon terms.</p>
      ) : null}
      {message ? (
        <p className="admin-alert admin-alert--success" role="status">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="admin-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {showCreate && isOwner ? (
        <form className="admin-form promotion-create-form" onSubmit={(event) => void create(event)}>
          <div className="promotion-create-form__heading">
            <div>
              <p className="eyebrow">Draft first</p>
              <h2>Create coupon campaign</h2>
            </div>
            <p>Every customer can use a code once. Orders reserve usage until payment expires.</p>
          </div>
          <div className="promotion-form-grid">
            <label>
              <span>Coupon code</span>
              <input
                name="code"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
                placeholder="WELCOME10"
                required
              />
            </label>
            <label>
              <span>Campaign name</span>
              <input name="name" minLength={1} maxLength={120} required />
            </label>
            <label className="field--wide">
              <span>Description (optional)</span>
              <input name="description" maxLength={500} />
            </label>
            <label>
              <span>Discount type</span>
              <select
                name="discountType"
                value={discountType}
                onChange={(event) => setDiscountType(event.target.value as CouponDiscountType)}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </label>
            <label>
              <span>{discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}</span>
              <input
                name="discountValue"
                type="number"
                min={discountType === 'PERCENTAGE' ? 1 : 0.01}
                max={discountType === 'PERCENTAGE' ? 90 : undefined}
                step={discountType === 'PERCENTAGE' ? 1 : 0.01}
                required
              />
            </label>
            {discountType === 'PERCENTAGE' ? (
              <label>
                <span>Maximum discount ₹ (optional)</span>
                <input name="maximumDiscount" inputMode="decimal" pattern="\d+(?:\.\d{1,2})?" />
              </label>
            ) : null}
            <label>
              <span>Minimum subtotal ₹</span>
              <input
                name="minimumSubtotal"
                inputMode="decimal"
                pattern="\d+(?:\.\d{1,2})?"
                defaultValue="0.00"
                required
              />
            </label>
            <label>
              <span>Total usage limit</span>
              <input
                name="usageLimit"
                type="number"
                min={1}
                max={1_000_000}
                defaultValue={100}
                required
              />
            </label>
            <label>
              <span>Starts</span>
              <input name="startsAt" type="datetime-local" defaultValue={defaultStart} required />
            </label>
            <label>
              <span>Ends</span>
              <input name="endsAt" type="datetime-local" defaultValue={defaultEnd} required />
            </label>
          </div>
          <button className="button button--dark" type="submit" disabled={createState.isLoading}>
            {createState.isLoading ? 'Saving draft…' : 'Save draft coupon'}
          </button>
        </form>
      ) : null}

      {editingCoupon && isOwner ? (
        <form
          key={`${editingCoupon.id}:${editingCoupon.version}`}
          className="admin-form promotion-create-form"
          onSubmit={(event) => void saveEdit(event)}
        >
          <div className="promotion-create-form__heading">
            <div>
              <p className="eyebrow">Campaign editor</p>
              <h2>Edit {editingCoupon.code}</h2>
            </div>
            <button type="button" onClick={() => setEditingCoupon(undefined)}>
              Close editor
            </button>
          </div>
          {editingCoupon.reservedCount + editingCoupon.redeemedCount > 0 ? (
            <p className="admin-alert">
              Discount code and value are locked because usage has already been allocated.
            </p>
          ) : null}
          <div className="promotion-form-grid">
            <label>
              <span>Coupon code</span>
              <input
                name="code"
                defaultValue={editingCoupon.code}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
                disabled={editingCoupon.reservedCount + editingCoupon.redeemedCount > 0}
                required
              />
            </label>
            <label>
              <span>Campaign name</span>
              <input name="name" defaultValue={editingCoupon.name} maxLength={120} required />
            </label>
            <label className="field--wide">
              <span>Description (optional)</span>
              <input
                name="description"
                defaultValue={editingCoupon.description ?? ''}
                maxLength={500}
              />
            </label>
            <label>
              <span>Discount type</span>
              <select
                value={editDiscountType}
                disabled={editingCoupon.reservedCount + editingCoupon.redeemedCount > 0}
                onChange={(event) => setEditDiscountType(event.target.value as CouponDiscountType)}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </label>
            <label>
              <span>{editDiscountType === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}</span>
              <input
                name="discountValue"
                type="number"
                min={editDiscountType === 'PERCENTAGE' ? 1 : 0.01}
                max={editDiscountType === 'PERCENTAGE' ? 90 : undefined}
                step={editDiscountType === 'PERCENTAGE' ? 1 : 0.01}
                defaultValue={
                  editDiscountType === 'PERCENTAGE'
                    ? editingCoupon.percentageOff
                    : ((editingCoupon.fixedAmountInPaise ?? 0) / 100).toFixed(2)
                }
                disabled={editingCoupon.reservedCount + editingCoupon.redeemedCount > 0}
                required
              />
            </label>
            {editDiscountType === 'PERCENTAGE' ? (
              <label>
                <span>Maximum discount ₹ (optional)</span>
                <input
                  name="maximumDiscount"
                  inputMode="decimal"
                  pattern="\d+(?:\.\d{1,2})?"
                  defaultValue={
                    editingCoupon.maximumDiscountInPaise
                      ? (editingCoupon.maximumDiscountInPaise / 100).toFixed(2)
                      : ''
                  }
                  disabled={editingCoupon.reservedCount + editingCoupon.redeemedCount > 0}
                />
              </label>
            ) : null}
            <label>
              <span>Minimum subtotal ₹</span>
              <input
                name="minimumSubtotal"
                defaultValue={(editingCoupon.minimumSubtotalInPaise / 100).toFixed(2)}
                inputMode="decimal"
                pattern="\d+(?:\.\d{1,2})?"
                required
              />
            </label>
            <label>
              <span>Total usage limit</span>
              <input
                name="usageLimit"
                type="number"
                min={editingCoupon.reservedCount + editingCoupon.redeemedCount || 1}
                max={1_000_000}
                defaultValue={editingCoupon.usageLimit}
                required
              />
            </label>
            <label>
              <span>Starts</span>
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={localDateTime(new Date(editingCoupon.startsAt))}
                required
              />
            </label>
            <label>
              <span>Ends</span>
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={localDateTime(new Date(editingCoupon.endsAt))}
                required
              />
            </label>
          </div>
          <button className="button button--dark" type="submit" disabled={updateState.isLoading}>
            {updateState.isLoading ? 'Saving changes…' : 'Save campaign changes'}
          </button>
        </form>
      ) : null}

      <div className="admin-filter-panel promotion-filter-panel">
        <form
          key={search}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            updateParam('search', formText(new FormData(event.currentTarget), 'search'));
          }}
        >
          <label>
            <span>Search</span>
            <input
              name="search"
              defaultValue={search}
              maxLength={100}
              placeholder="Code or campaign"
            />
          </label>
          <button type="submit">Search</button>
        </form>
        <label>
          <span>Status</span>
          <select
            value={status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            {statuses.map((value) => (
              <option key={value || 'all'} value={value}>
                {value || 'All statuses'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setParams({})}>
          Clear filters
        </button>
      </div>

      <div className="admin-list-summary" aria-live="polite">
        <span>{coupons.data ? `${coupons.data.total} campaigns` : 'Loading campaigns'}</span>
        {coupons.isFetching && !coupons.isLoading ? <span>Refreshing…</span> : null}
      </div>
      {coupons.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
      {coupons.isError ? (
        <InlineError
          message="Coupons could not be loaded."
          onRetry={() => void coupons.refetch()}
        />
      ) : null}
      {coupons.data ? (
        <>
          <div className="admin-table-wrap" data-refreshing={coupons.isFetching}>
            <table className="admin-table promotion-table">
              <caption className="sr-only">Coupon campaigns</caption>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Offer</th>
                  <th>Window</th>
                  <th>Usage</th>
                  <th>Availability</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.data.items.map((coupon) => {
                  const busy = actionId === coupon.id && updateState.isLoading;
                  return (
                    <tr key={coupon.id}>
                      <td>
                        <strong>{coupon.code}</strong>
                        <span>{coupon.name}</span>
                      </td>
                      <td>
                        <strong>{discountLabel(coupon)}</strong>
                        <span>Min. {formatPrice(coupon.minimumSubtotalInPaise)}</span>
                      </td>
                      <td>
                        <strong>{new Date(coupon.startsAt).toLocaleDateString('en-IN')}</strong>
                        <span>to {new Date(coupon.endsAt).toLocaleDateString('en-IN')}</span>
                      </td>
                      <td>
                        <strong>
                          {coupon.redeemedCount} paid / {coupon.reservedCount} held
                        </strong>
                        <span>
                          {coupon.remainingUses} of {coupon.usageLimit} remaining
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge" data-status={coupon.availability}>
                          {coupon.availability}
                        </span>
                        <span>{coupon.status}</span>
                      </td>
                      <td>
                        {isOwner && coupon.status !== 'ARCHIVED' ? (
                          <div className="promotion-row-actions">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setEditingCoupon(coupon);
                                setEditDiscountType(coupon.discountType);
                                setShowCreate(false);
                              }}
                            >
                              Edit
                            </button>
                            {coupon.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void changeStatus(coupon, 'PAUSED')}
                              >
                                Pause
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void changeStatus(coupon, 'ACTIVE')}
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void changeStatus(coupon, 'ARCHIVED')}
                            >
                              Archive
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={coupons.data.page}
            totalPages={coupons.data.totalPages}
            total={coupons.data.total}
            limit={coupons.data.limit}
            disabled={coupons.isFetching}
            onPageChange={(nextPage) => updateParam('page', String(nextPage), false)}
          />
        </>
      ) : null}
    </section>
  );
}
