import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { PageMeta } from '@/app/components/page-meta';
import {
  useLoginCustomerMutation,
  useRegisterCustomerMutation,
} from '@/features/customer-auth/customer-auth-api';
import { safeCustomerReturnPath } from '@/features/customer-auth/auth-navigation';
import { setCustomer } from '@/features/session/session-slice';
import { apiErrorMessage } from '@/shared/commerce';

import { useAppDispatch, useAppSelector } from '@/app/hooks';

interface AuthLocationState {
  returnTo?: unknown;
  message?: unknown;
}

export function Component() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const customerStatus = useAppSelector((state) => state.session.customerStatus);
  const isRegistration = location.pathname === '/register';
  const locationState = location.state as AuthLocationState | null;
  const returnTo = safeCustomerReturnPath(locationState?.returnTo);
  const successMessage =
    typeof locationState?.message === 'string' ? locationState.message : undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const [login, loginState] = useLoginCustomerMutation();
  const [register, registerState] = useRegisterCustomerMutation();
  const submitting = loginState.isLoading || registerState.isLoading;

  if (customerStatus === 'authenticated') return <Navigate replace to={returnTo} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (isRegistration && name.trim().length < 2) {
      setFormError('Please enter at least two characters for your name.');
      return;
    }
    if (isRegistration && password.length < 12) {
      setFormError('Use at least 12 characters for your password.');
      return;
    }
    if (isRegistration && password !== passwordConfirmation) {
      setFormError('The passwords do not match.');
      return;
    }

    try {
      const response = isRegistration
        ? await register({ name: name.trim(), email: normalizedEmail, password }).unwrap()
        : await login({ email: normalizedEmail, password }).unwrap();
      dispatch(setCustomer(response.customer));
      await navigate(returnTo, { replace: true });
    } catch (error) {
      setFormError(
        apiErrorMessage(
          error,
          isRegistration
            ? 'Your account could not be created. Please try again.'
            : 'We could not sign you in. Check your details and retry.',
        ),
      );
    }
  }

  return (
    <section className="auth-page">
      <PageMeta
        title={isRegistration ? 'Create account' : 'Sign in'}
        description="Access your iFixer bag, orders and account."
        noIndex
      />
      <div className="auth-page__art" aria-hidden="true">
        <span>R</span>
        <p>Belong to the culture.</p>
      </div>

      <div className="auth-panel">
        <div className="auth-panel__content">
          <p className="eyebrow">iFixer / Account</p>
          <h1>{isRegistration ? 'Create your account.' : 'Welcome back.'}</h1>
          <p>
            {isRegistration
              ? 'Save your bag and continue your iFixer journey across devices.'
              : 'Sign in to continue with your saved bag and account.'}
          </p>

          {successMessage ? (
            <p className="auth-message auth-message--success" role="status">
              {successMessage}
            </p>
          ) : null}
          {formError ? (
            <p className="auth-message" role="alert">
              {formError}
            </p>
          ) : null}

          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {isRegistration ? (
              <label>
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={name}
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={email}
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={password}
                minLength={isRegistration ? 12 : undefined}
                maxLength={128}
                autoComplete={isRegistration ? 'new-password' : 'current-password'}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              {isRegistration ? <small>At least 12 characters.</small> : null}
            </label>

            {isRegistration ? (
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  name="passwordConfirmation"
                  value={passwordConfirmation}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                />
              </label>
            ) : null}

            {!isRegistration ? (
              <Link className="auth-form__help" to="/forgot-password">
                Forgot password?
              </Link>
            ) : null}

            <button
              className="button button--dark auth-form__submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Please wait…' : isRegistration ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegistration ? 'Already have an account?' : 'New to iFixer?'}{' '}
            <Link to={isRegistration ? '/login' : '/register'} state={{ returnTo }}>
              {isRegistration ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
