import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { PageMeta } from '@/app/components/page-meta';
import {
  useChangeCustomerPasswordMutation,
  useLogoutAllCustomerSessionsMutation,
  useLogoutCustomerMutation,
  useRequestVerificationEmailMutation,
} from '@/features/customer-auth/customer-auth-api';
import { CustomerProfileManagement } from '@/features/customer-auth/customer-profile-management';
import { CustomerAddressBook } from '@/features/customer-addresses/customer-address-book';
import { clearCustomer } from '@/features/session/session-slice';
import { apiErrorMessage } from '@/shared/commerce';

export function Component() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const customer = useAppSelector((state) => state.session.customer);
  const [logout, logoutState] = useLogoutCustomerMutation();
  const [logoutAll, logoutAllState] = useLogoutAllCustomerSessionsMutation();
  const [changePassword, passwordState] = useChangeCustomerPasswordMutation();
  const [requestVerification, verificationState] = useRequestVerificationEmailMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  async function sendVerificationEmail() {
    setVerificationMessage('');
    try {
      const response = await requestVerification().unwrap();
      setVerificationMessage(response.message);
    } catch (error) {
      setVerificationMessage(
        apiErrorMessage(error, 'The verification email could not be requested. Please retry.'),
      );
    }
  }

  async function endSession(allSessions: boolean) {
    setAccountError('');
    try {
      if (allSessions) await logoutAll().unwrap();
      else await logout().unwrap();
      dispatch(clearCustomer());
      await navigate('/', { replace: true });
    } catch (error) {
      setAccountError(apiErrorMessage(error, 'We could not sign you out. Please retry.'));
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage('');
    if (newPassword.length < 12) {
      setPasswordMessage('Use at least 12 characters for the new password.');
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordMessage('The new passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMessage('Your new password must be different.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      dispatch(clearCustomer());
      await navigate('/login', {
        replace: true,
        state: { message: 'Password changed. Please sign in again.' },
      });
    } catch (error) {
      setPasswordMessage(apiErrorMessage(error, 'Your password could not be changed.'));
    }
  }

  return (
    <section className="account-page">
      <PageMeta title="Your account" description="Manage your iFixer account." noIndex />
      <header className="account-hero">
        <div>
          <p className="eyebrow">Your iFixer</p>
          <h1>Hello, {customer?.name?.split(' ')[0] || 'there'}.</h1>
        </div>
        <button
          className="text-button"
          type="button"
          disabled={logoutState.isLoading}
          onClick={() => void endSession(false)}
        >
          {logoutState.isLoading ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      {accountError ? (
        <p className="auth-message" role="alert">
          {accountError}
        </p>
      ) : null}

      <div className="account-grid">
        <article className="account-card account-card--profile">
          <p className="eyebrow">Profile</p>
          <h2>Account details</h2>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{customer?.name || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {customer?.email || 'Not provided'}
                {customer?.email ? (
                  <span
                    className={
                      customer.emailVerified
                        ? 'account-email-status account-email-status--verified'
                        : 'account-email-status'
                    }
                  >
                    {customer.emailVerified ? 'Verified' : 'Not verified'}
                  </span>
                ) : null}
              </dd>
            </div>
            {customer?.mobile ? (
              <div>
                <dt>Mobile</dt>
                <dd>
                  {customer.mobile}
                  <span
                    className={
                      customer.mobileVerified
                        ? 'account-email-status account-email-status--verified'
                        : 'account-email-status'
                    }
                  >
                    {customer.mobileVerified ? 'Verified' : 'Not verified'}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
          {customer?.email && !customer.emailVerified ? (
            <div className="account-verification">
              <p>Verify your email to secure account recovery and order communication.</p>
              <button
                className="text-button"
                type="button"
                disabled={verificationState.isLoading}
                onClick={() => void sendVerificationEmail()}
              >
                {verificationState.isLoading ? 'Requesting…' : 'Send verification email'}
              </button>
              {verificationMessage ? (
                <p className="auth-message" role="status">
                  {verificationMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>

        {customer ? <CustomerProfileManagement customer={customer} /> : null}

        <article className="account-card account-card--orders">
          <p className="eyebrow">Orders</p>
          <h2>Your purchases</h2>
          <p>Review payment, fulfilment and delivery updates for every order.</p>
          <Link className="text-link" to="/account/orders">
            View your orders <span aria-hidden="true">↗</span>
          </Link>
        </article>

        <article className="account-card account-card--wishlist">
          <p className="eyebrow">Wishlist</p>
          <h2>Saved pieces</h2>
          <p>Return to favourites and manage your active back-in-stock email alerts.</p>
          <Link className="text-link" to="/account/wishlist">
            View your wishlist <span aria-hidden="true">↗</span>
          </Link>
        </article>

        <CustomerAddressBook customer={customer} />

        <article className="account-card account-card--security">
          <div>
            <p className="eyebrow">Security</p>
            <h2>Change password</h2>
            <p>Changing it signs you out on every device.</p>
          </div>
          <form className="auth-form" onSubmit={(event) => void submitPassword(event)}>
            <label>
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                maxLength={128}
                autoComplete="current-password"
                required
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label>
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <small>At least 12 characters.</small>
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmation}
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            {passwordMessage ? (
              <p className="auth-message" role="alert">
                {passwordMessage}
              </p>
            ) : null}
            <button
              className="button button--dark"
              type="submit"
              disabled={passwordState.isLoading}
            >
              {passwordState.isLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </article>

        <article className="account-card account-card--sessions">
          <p className="eyebrow">Active sessions</p>
          <h2>Every device</h2>
          <p>Revoke all browser sessions if you no longer recognise a signed-in device.</p>
          <button
            className="text-button"
            type="button"
            disabled={logoutAllState.isLoading}
            onClick={() => void endSession(true)}
          >
            {logoutAllState.isLoading ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </article>
      </div>
    </section>
  );
}
