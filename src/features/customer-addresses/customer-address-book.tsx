import { type FormEvent, useState } from 'react';

import { InlineError } from '@/app/components/catalog-feedback';
import type { CustomerIdentity } from '@/features/session/session-slice';
import { apiErrorMessage } from '@/shared/commerce';

import {
  useCreateCustomerAddressMutation,
  useDeleteCustomerAddressMutation,
  useGetCustomerAddressBookQuery,
  useMakeCustomerAddressDefaultMutation,
  useReplaceCustomerAddressMutation,
} from './customer-address-api';
import type { CustomerAddressFields, SavedCustomerAddress } from './customer-address.types';

interface AddressFormState extends Omit<CustomerAddressFields, 'countryCode'> {
  line2: string;
  isDefault: boolean;
}

function emptyForm(customer?: CustomerIdentity): AddressFormState {
  return {
    label: '',
    fullName: customer?.name ?? '',
    phone: customer?.mobile ?? '+91',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  };
}

function editForm(address: SavedCustomerAddress): AddressFormState {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

export function CustomerAddressBook({ customer }: { customer?: CustomerIdentity }) {
  const addressBook = useGetCustomerAddressBookQuery();
  const [createAddress, createState] = useCreateCustomerAddressMutation();
  const [replaceAddress, replaceState] = useReplaceCustomerAddressMutation();
  const [makeDefault, defaultState] = useMakeCustomerAddressDefaultMutation();
  const [deleteAddress, deleteState] = useDeleteCustomerAddressMutation();
  const [form, setForm] = useState<AddressFormState>(() => emptyForm(customer));
  const [editingId, setEditingId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const busy =
    createState.isLoading ||
    replaceState.isLoading ||
    defaultState.isLoading ||
    deleteState.isLoading ||
    addressBook.isFetching;

  function beginCreate() {
    setEditingId(undefined);
    setForm(emptyForm(customer));
    setMessage('');
    setFormOpen(true);
  }

  function beginEdit(address: SavedCustomerAddress) {
    setEditingId(address.id);
    setForm(editForm(address));
    setMessage('');
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(undefined);
    setFormOpen(false);
    setMessage('');
  }

  function fields(): CustomerAddressFields {
    const line2 = form.line2.trim();
    return {
      label: form.label.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      ...(line2 ? { line2 } : {}),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      countryCode: 'IN',
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const book = addressBook.data;
    if (!book) return;
    setMessage('');
    try {
      if (editingId) {
        await replaceAddress({
          id: editingId,
          expectedVersion: book.version,
          ...fields(),
        }).unwrap();
      } else {
        await createAddress({
          expectedVersion: book.version,
          isDefault: form.isDefault,
          ...fields(),
        }).unwrap();
      }
      closeForm();
    } catch (error) {
      setMessage(apiErrorMessage(error, 'The address could not be saved. Refresh and retry.'));
      void addressBook.refetch();
    }
  }

  async function setDefaultAddress(address: SavedCustomerAddress) {
    const book = addressBook.data;
    if (!book || address.isDefault) return;
    setMessage('');
    try {
      await makeDefault({ id: address.id, expectedVersion: book.version }).unwrap();
    } catch (error) {
      setMessage(apiErrorMessage(error, 'The default address could not be changed.'));
      void addressBook.refetch();
    }
  }

  async function remove(address: SavedCustomerAddress) {
    const book = addressBook.data;
    if (!book || !window.confirm(`Delete the saved address “${address.label}”?`)) return;
    setMessage('');
    try {
      await deleteAddress({ id: address.id, expectedVersion: book.version }).unwrap();
      if (editingId === address.id) closeForm();
    } catch (error) {
      setMessage(apiErrorMessage(error, 'The address could not be deleted.'));
      void addressBook.refetch();
    }
  }

  return (
    <article className="account-card account-card--addresses">
      <div className="address-book__heading">
        <div>
          <p className="eyebrow">Address book</p>
          <h2>Saved delivery details</h2>
          <p>Keep up to {addressBook.data?.limit ?? 10} Indian delivery addresses.</p>
        </div>
        <button
          className="text-button"
          type="button"
          disabled={
            busy || (addressBook.data?.addresses.length ?? 0) >= (addressBook.data?.limit ?? 10)
          }
          onClick={beginCreate}
        >
          Add address
        </button>
      </div>

      {addressBook.isLoading ? <p aria-live="polite">Loading saved addresses…</p> : null}
      {addressBook.isError ? (
        <InlineError
          message="Your saved addresses could not be loaded."
          onRetry={() => void addressBook.refetch()}
        />
      ) : null}

      {addressBook.data?.addresses.length ? (
        <div className="address-book__list">
          {addressBook.data.addresses.map((address) => (
            <section key={address.id} className="address-book__item">
              <header>
                <strong>{address.label}</strong>
                {address.isDefault ? <span>Default</span> : null}
              </header>
              <address>
                <span>{address.fullName}</span>
                <span>{address.line1}</span>
                {address.line2 ? <span>{address.line2}</span> : null}
                <span>
                  {address.city}, {address.state} {address.postalCode}
                </span>
                <span>{address.phone}</span>
              </address>
              <div>
                <button type="button" disabled={busy} onClick={() => beginEdit(address)}>
                  Edit
                </button>
                {!address.isDefault ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setDefaultAddress(address)}
                  >
                    Make default
                  </button>
                ) : null}
                <button type="button" disabled={busy} onClick={() => void remove(address)}>
                  Delete
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {addressBook.data && !addressBook.data.addresses.length && !formOpen ? (
        <p className="address-book__empty">No saved addresses yet. Add one for faster checkout.</p>
      ) : null}

      {formOpen ? (
        <form className="address-book__form" onSubmit={(event) => void save(event)}>
          <header>
            <h3>{editingId ? 'Edit address' : 'Add an address'}</h3>
            <button type="button" onClick={closeForm}>
              Cancel
            </button>
          </header>
          <div className="checkout-fields">
            <label>
              <span>Label</span>
              <input
                value={form.label}
                maxLength={50}
                placeholder="Home or Work"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Full name</span>
              <input
                value={form.fullName}
                maxLength={120}
                autoComplete="name"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label className="field--wide">
              <span>Mobile number</span>
              <input
                type="tel"
                value={form.phone}
                pattern="\+?[1-9]\d{7,14}"
                maxLength={16}
                autoComplete="tel"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
            <label className="field--wide">
              <span>Address line 1</span>
              <input
                value={form.line1}
                maxLength={200}
                autoComplete="address-line1"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, line1: event.target.value }))
                }
              />
            </label>
            <label className="field--wide">
              <span>Address line 2 (optional)</span>
              <input
                value={form.line2}
                maxLength={200}
                autoComplete="address-line2"
                onChange={(event) =>
                  setForm((current) => ({ ...current, line2: event.target.value }))
                }
              />
            </label>
            <label>
              <span>City</span>
              <input
                value={form.city}
                maxLength={100}
                autoComplete="address-level2"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, city: event.target.value }))
                }
              />
            </label>
            <label>
              <span>State</span>
              <input
                value={form.state}
                maxLength={100}
                autoComplete="address-level1"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, state: event.target.value }))
                }
              />
            </label>
            <label>
              <span>PIN code</span>
              <input
                value={form.postalCode}
                pattern="\d{6}"
                maxLength={6}
                inputMode="numeric"
                autoComplete="postal-code"
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, postalCode: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Country</span>
              <input value="India" readOnly aria-readonly="true" />
            </label>
          </div>
          {!editingId ? (
            <label className="address-book__default-option">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isDefault: event.target.checked }))
                }
              />
              <span>Use as my default delivery address</span>
            </label>
          ) : null}
          {message ? (
            <p className="auth-message" role="alert">
              {message}
            </p>
          ) : null}
          <button className="button button--dark" type="submit" disabled={busy}>
            {createState.isLoading || replaceState.isLoading ? 'Saving…' : 'Save address'}
          </button>
        </form>
      ) : null}

      {message && !formOpen ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
    </article>
  );
}
