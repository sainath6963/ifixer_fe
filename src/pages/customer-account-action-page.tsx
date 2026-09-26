import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { PageMeta } from '@/app/components/page-meta';
import {
  useConfirmCustomerEmailChangeMutation,
  useForgotCustomerPasswordMutation,
  useLazyGetCustomerQuery,
  useResetCustomerPasswordMutation,
  useVerifyCustomerEmailMutation,
} from '@/features/customer-auth/customer-auth-api';
import { apiErrorMessage } from '@/shared/commerce';

type ActionMode = 'forgot' | 'reset' | 'verify' | 'change-email';

function modeFor(pathname: string): ActionMode {
  if (pathname === '/reset-password') return 'reset';
  if (pathname === '/verify-email') return 'verify';
  if (pathname === '/change-email') return 'change-email';
  return 'forgot';
}

function tokenFrom(search: string): string {
  const token = new URLSearchParams(search).get('token') ?? '';
  return /^[A-Za-z0-9_-]{32,200}$/.test(token) ? token : '';
}

export function Component() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = modeFor(location.pathname);
  const [actionToken] = useState(() => tokenFrom(window.location.search));
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotPassword, forgotState] = useForgotCustomerPasswordMutation();
  const [resetPassword, resetState] = useResetCustomerPasswordMutation();
  const [verifyEmail, verifyState] = useVerifyCustomerEmailMutation();
  const [confirmEmailChange, emailChangeState] = useConfirmCustomerEmailChangeMutation();
  const [refreshCustomer] = useLazyGetCustomerQuery();

  useEffect(() => {
    if ((mode === 'reset' || mode === 'verify' || mode === 'change-email') && location.search) {
      window.history.replaceState(window.history.state, '', location.pathname);
    }
  }, [location.pathname, location.search, mode]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    try {
      const response = await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      setMessage(response.message);
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'Reset instructions could not be requested. Please retry.'),
      );
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    if (!actionToken) {
      setErrorMessage('This password reset link is invalid or incomplete.');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage('Use at least 12 characters for your new password.');
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage('The new passwords do not match.');
      return;
    }
    try {
      await resetPassword({ token: actionToken, newPassword }).unwrap();
      await navigate('/login', {
        replace: true,
        state: { message: 'Password reset. Sign in with your new password.' },
      });
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'This reset link is invalid, expired, or already used.'),
      );
    }
  }

  async function confirmVerification() {
    setErrorMessage('');
    if (!actionToken) {
      setErrorMessage('This verification link is invalid or incomplete.');
      return;
    }
    try {
      await verifyEmail({ token: actionToken }).unwrap();
      try {
        await refreshCustomer(undefined, true).unwrap();
      } catch {
        // Verification is also valid when the customer opened the link while signed out.
      }
      setMessage('Your email is verified.');
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'This verification link is invalid, expired, or already used.'),
      );
    }
  }

  async function confirmEmail() {
    setErrorMessage('');
    if (!actionToken) {
      setErrorMessage('This email-change link is invalid or incomplete.');
      return;
    }
    try {
      await confirmEmailChange({ token: actionToken }).unwrap();
      await navigate('/login', {
        replace: true,
        state: { message: 'Email changed. Sign in with your new email.' },
      });
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'This email-change link is invalid, expired, or already used.'),
      );
    }
  }

  const title =
    mode === 'forgot'
      ? 'Forgot password'
      : mode === 'reset'
        ? 'Choose a new password'
        : mode === 'verify'
          ? 'Verify your email'
          : 'Confirm your new email';
  const description =
    mode === 'forgot'
      ? 'Enter your account email and we will send a secure reset link.'
      : mode === 'reset'
        ? 'Use this one-time link to secure your iFixer account.'
        : mode === 'verify'
          ? 'Confirm your iFixer account email. The link is used only after you approve it.'
          : 'Approve this new email address. Every signed-in device will be signed out for security.';

  return (
    <section className="auth-page auth-page--action">
      <PageMeta title={title} description={description} noIndex />
      <div className="auth-page__art" aria-hidden="true">
        <span>R</span>
        <p>Belong to the culture.</p>
      </div>
      <div className="auth-panel">
        <div className="auth-panel__content">
          <p className="eyebrow">iFixer / Account security</p>
          <h1>{title}.</h1>
          <p>{description}</p>

          {message ? (
            <p className="auth-message auth-message--success" role="status">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="auth-message" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {mode === 'forgot' && !message ? (
            <form className="auth-form" onSubmit={(event) => void requestReset(event)}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  required
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                className="button button--dark auth-form__submit"
                type="submit"
                disabled={forgotState.isLoading}
              >
                {forgotState.isLoading ? 'Requesting…' : 'Send reset link'}
              </button>
            </form>
          ) : null}

          {mode === 'reset' ? (
            <form className="auth-form" onSubmit={(event) => void confirmReset(event)}>
              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={!actionToken}
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
                  disabled={!actionToken}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <button
                className="button button--dark auth-form__submit"
                type="submit"
                disabled={!actionToken || resetState.isLoading}
              >
                {resetState.isLoading ? 'Securing account…' : 'Reset password'}
              </button>
            </form>
          ) : null}

          {mode === 'verify' && !message ? (
            <button
              className="button button--dark auth-action__button"
              type="button"
              disabled={!actionToken || verifyState.isLoading}
              onClick={() => void confirmVerification()}
            >
              {verifyState.isLoading ? 'Verifying…' : 'Verify email'}
            </button>
          ) : null}

          {mode === 'change-email' ? (
            <button
              className="button button--dark auth-action__button"
              type="button"
              disabled={!actionToken || emailChangeState.isLoading}
              onClick={() => void confirmEmail()}
            >
              {emailChangeState.isLoading ? 'Confirming…' : 'Confirm new email'}
            </button>
          ) : null}

          <p className="auth-switch">
            {mode === 'verify' && message ? (
              <Link to="/account">Continue to your account</Link>
            ) : (
              <Link to="/login">Back to sign in</Link>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
