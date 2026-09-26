import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { RouteLoading } from '@/app/components/route-loading';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLoginAdminMutation } from '@/features/admin/admin-auth-api';
import { safeAdminReturnPath } from '@/features/admin/admin-navigation';
import { setAdmin } from '@/features/session/session-slice';
import { apiErrorMessage } from '@/shared/commerce';

export function Component() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.session.adminStatus);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [login, loginState] = useLoginAdminMutation();
  const returnTo = safeAdminReturnPath((location.state as { returnTo?: unknown } | null)?.returnTo);
  const successMessage =
    typeof (location.state as { message?: unknown } | null)?.message === 'string'
      ? (location.state as { message: string }).message
      : undefined;

  if (status === 'unknown') return <RouteLoading />;
  if (status === 'authenticated') return <Navigate replace to={returnTo} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    try {
      const response = await login({ email: email.trim().toLowerCase(), password }).unwrap();
      dispatch(setAdmin(response.admin));
      await navigate(returnTo, { replace: true });
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Admin sign-in failed. Check your credentials.'));
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__brand" aria-hidden="true">
        <span>iF</span>
        <p>Operations / iFixer</p>
      </section>
      <section className="admin-login__panel">
        <div>
          <p className="eyebrow">Restricted access</p>
          <h1>Admin sign in</h1>
          <p>Use your authorized shop account to continue.</p>
          {successMessage ? (
            <p className="auth-message auth-message--success" role="status">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="auth-message" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                maxLength={254}
                autoComplete="username"
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                maxLength={128}
                autoComplete="current-password"
                required
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="button button--dark" type="submit" disabled={loginState.isLoading}>
              {loginState.isLoading ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
