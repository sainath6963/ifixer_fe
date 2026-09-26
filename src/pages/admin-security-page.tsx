import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/hooks';
import {
  useChangeAdminPasswordMutation,
  useLogoutAllAdminSessionsMutation,
} from '@/features/admin/admin-auth-api';
import { apiErrorMessage } from '@/shared/commerce';

export function Component() {
  const navigate = useNavigate();
  const admin = useAppSelector((state) => state.session.admin);
  const [changePassword, passwordState] = useChangeAdminPasswordMutation();
  const [logoutAll, logoutAllState] = useLogoutAllAdminSessionsMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    if (newPassword.length < 12) {
      setErrorMessage('New password must contain at least 12 characters.');
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage('New password confirmation does not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMessage('New password must be different from the current password.');
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      await navigate('/admin/login', {
        replace: true,
        state: { message: 'Password changed. Sign in again on this device.' },
      });
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Admin password could not be changed.'));
    }
  }

  async function revokeAllSessions() {
    if (!confirmLogoutAll) return;
    setErrorMessage('');
    try {
      await logoutAll().unwrap();
      await navigate('/admin/login', {
        replace: true,
        state: { message: 'Every admin session for your account has been revoked.' },
      });
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Admin sessions could not be revoked.'));
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Account security</p>
          <h1>Protect operations</h1>
          <p>Manage credentials and revoke access when a device may no longer be trusted.</p>
        </div>
      </header>

      {errorMessage ? (
        <p className="admin-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="admin-security-grid">
        <article className="admin-panel admin-security-profile">
          <p className="eyebrow">Signed in as</p>
          <h2>{admin?.name}</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Email</dt>
              <dd>{admin?.email}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{admin?.roles.join(' / ')}</dd>
            </div>
          </dl>
        </article>

        <form className="admin-form" onSubmit={(event) => void submitPassword(event)}>
          <div>
            <p className="eyebrow">Credentials</p>
            <h2>Change password</h2>
          </div>
          <p className="admin-form-copy">A successful change signs this account out everywhere.</p>
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
          <button className="button button--dark" type="submit" disabled={passwordState.isLoading}>
            {passwordState.isLoading ? 'Changing…' : 'Change password'}
          </button>
        </form>

        <article className="admin-form admin-security-danger">
          <div>
            <p className="eyebrow">Device access</p>
            <h2>Revoke every session</h2>
          </div>
          <p className="admin-form-copy">
            Use this if a device is missing or you suspect account access. You will also be signed
            out here.
          </p>
          <label className="admin-check-field admin-check-field--danger">
            <input
              type="checkbox"
              checked={confirmLogoutAll}
              onChange={(event) => setConfirmLogoutAll(event.target.checked)}
            />
            Revoke all sessions for {admin?.email}
          </label>
          <button
            className="button"
            type="button"
            disabled={!confirmLogoutAll || logoutAllState.isLoading}
            onClick={() => void revokeAllSessions()}
          >
            {logoutAllState.isLoading ? 'Revoking…' : 'Revoke all sessions'}
          </button>
        </article>
      </div>
    </section>
  );
}
