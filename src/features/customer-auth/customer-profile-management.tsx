import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/hooks';
import { apiErrorMessage } from '@/shared/commerce';
import { clearCustomer, type CustomerIdentity } from '@/features/session/session-slice';

import {
  useConfirmCustomerMobileChangeMutation,
  useDeactivateCustomerAccountMutation,
  useRequestCustomerEmailChangeMutation,
  useRequestCustomerMobileChangeMutation,
  useUpdateCustomerPreferencesMutation,
  useUpdateCustomerProfileMutation,
} from './customer-auth-api';

interface CustomerProfileManagementProps {
  customer: CustomerIdentity;
}

export function CustomerProfileManagement({ customer }: CustomerProfileManagementProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [updateProfile, profileState] = useUpdateCustomerProfileMutation();
  const [updatePreferences, preferencesState] = useUpdateCustomerPreferencesMutation();
  const [requestEmailChange, emailState] = useRequestCustomerEmailChangeMutation();
  const [requestMobileChange, mobileRequestState] = useRequestCustomerMobileChangeMutation();
  const [confirmMobileChange, mobileConfirmState] = useConfirmCustomerMobileChangeMutation();
  const [deactivate, deactivateState] = useDeactivateCustomerAccountMutation();
  const [name, setName] = useState(customer.name ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [mobile, setMobile] = useState(customer.mobile ?? '');
  const [mobilePassword, setMobilePassword] = useState('');
  const [challenge, setChallenge] = useState<{
    id: string;
    expiresAt: string;
    developmentOtp?: string;
  }>();
  const [otp, setOtp] = useState('');
  const [marketingEmail, setMarketingEmail] = useState(
    customer.communicationPreferences.marketingEmail,
  );
  const [backInStockEmail, setBackInStockEmail] = useState(
    customer.communicationPreferences.backInStockEmail,
  );
  const [orderUpdatesSms, setOrderUpdatesSms] = useState(
    customer.communicationPreferences.orderUpdatesSms,
  );
  const [orderUpdatesWhatsapp, setOrderUpdatesWhatsapp] = useState(
    customer.communicationPreferences.orderUpdatesWhatsapp,
  );
  const [deactivationPassword, setDeactivationPassword] = useState('');
  const [deactivationConfirmation, setDeactivationConfirmation] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const [deactivationMessage, setDeactivationMessage] = useState('');

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage('');
    try {
      await updateProfile({ name: name.trim(), expectedVersion: customer.version }).unwrap();
      setProfileMessage('Name updated.');
    } catch (error) {
      setProfileMessage(apiErrorMessage(error, 'Your profile could not be updated.'));
    }
  }

  async function sendEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactMessage('');
    try {
      const response = await requestEmailChange({
        newEmail: newEmail.trim().toLowerCase(),
        currentPassword: emailPassword,
      }).unwrap();
      setNewEmail('');
      setEmailPassword('');
      setContactMessage(response.message);
    } catch (error) {
      setContactMessage(apiErrorMessage(error, 'The email change could not be requested.'));
    }
  }

  async function sendMobileCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactMessage('');
    try {
      const response = await requestMobileChange({
        mobile: mobile.trim(),
        currentPassword: mobilePassword,
      }).unwrap();
      setChallenge({
        id: response.challengeId,
        expiresAt: response.expiresAt,
        developmentOtp: response.developmentOtp,
      });
      setMobilePassword('');
      setContactMessage('Verification code created. Enter it before it expires.');
    } catch (error) {
      setContactMessage(apiErrorMessage(error, 'The mobile verification code could not be sent.'));
    }
  }

  async function verifyMobile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setContactMessage('');
    try {
      await confirmMobileChange({
        challengeId: challenge.id,
        otp,
        expectedVersion: customer.version,
      }).unwrap();
      setChallenge(undefined);
      setOtp('');
      setContactMessage('Mobile number verified and updated.');
    } catch (error) {
      setContactMessage(apiErrorMessage(error, 'The mobile number could not be verified.'));
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferencesMessage('');
    try {
      await updatePreferences({
        marketingEmail,
        backInStockEmail,
        orderUpdatesSms,
        orderUpdatesWhatsapp,
        expectedVersion: customer.version,
      }).unwrap();
      setPreferencesMessage('Communication preferences saved.');
    } catch (error) {
      setPreferencesMessage(apiErrorMessage(error, 'Preferences could not be saved.'));
    }
  }

  async function deactivateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeactivationMessage('');
    if (deactivationConfirmation !== 'DEACTIVATE') {
      setDeactivationMessage('Type DEACTIVATE exactly to continue.');
      return;
    }
    try {
      await deactivate({
        currentPassword: deactivationPassword,
        confirmation: 'DEACTIVATE',
        reason: deactivationReason.trim() || undefined,
      }).unwrap();
      dispatch(clearCustomer());
      await navigate('/', { replace: true });
    } catch (error) {
      setDeactivationMessage(apiErrorMessage(error, 'The account could not be deactivated.'));
    }
  }

  return (
    <>
      <article className="account-card account-card--profile-editor">
        <div>
          <p className="eyebrow">Personal details</p>
          <h2>Edit your profile</h2>
        </div>
        <form className="auth-form" onSubmit={(event) => void saveProfile(event)}>
          <label>
            <span>Name</span>
            <input
              value={name}
              minLength={2}
              maxLength={120}
              autoComplete="name"
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {profileMessage ? (
            <p className="auth-message" role="status">
              {profileMessage}
            </p>
          ) : null}
          <button className="button button--dark" type="submit" disabled={profileState.isLoading}>
            {profileState.isLoading ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </article>

      <article className="account-card account-card--contacts">
        <div>
          <p className="eyebrow">Verified contacts</p>
          <h2>Email and mobile</h2>
          <p>Email changes use a one-time link and sign out every device after confirmation.</p>
        </div>
        <form className="auth-form" onSubmit={(event) => void sendEmailChange(event)}>
          <label>
            <span>New email</span>
            <input
              type="email"
              value={newEmail}
              maxLength={254}
              autoComplete="email"
              required
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </label>
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={emailPassword}
              maxLength={128}
              autoComplete="current-password"
              required
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </label>
          <button className="text-button" type="submit" disabled={emailState.isLoading}>
            {emailState.isLoading ? 'Requesting…' : 'Send confirmation link'}
          </button>
        </form>

        <form
          className="auth-form account-contact-form"
          onSubmit={(event) => void sendMobileCode(event)}
        >
          <label>
            <span>Mobile number</span>
            <input
              type="tel"
              value={mobile}
              pattern="\+?[1-9][0-9]{7,14}"
              placeholder="+919876543210"
              autoComplete="tel"
              required
              onChange={(event) => setMobile(event.target.value)}
            />
          </label>
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={mobilePassword}
              maxLength={128}
              autoComplete="current-password"
              required
              onChange={(event) => setMobilePassword(event.target.value)}
            />
          </label>
          <button className="text-button" type="submit" disabled={mobileRequestState.isLoading}>
            {mobileRequestState.isLoading ? 'Requesting…' : 'Request verification code'}
          </button>
        </form>

        {challenge ? (
          <form
            className="auth-form account-otp-form"
            onSubmit={(event) => void verifyMobile(event)}
          >
            <label>
              <span>6-digit code</span>
              <input
                value={otp}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              />
              <small>Expires {new Date(challenge.expiresAt).toLocaleTimeString('en-IN')}.</small>
            </label>
            {challenge.developmentOtp ? (
              <p className="development-note">
                Development code: <strong>{challenge.developmentOtp}</strong>
              </p>
            ) : null}
            <button
              className="button button--dark"
              type="submit"
              disabled={mobileConfirmState.isLoading}
            >
              {mobileConfirmState.isLoading ? 'Verifying…' : 'Verify mobile'}
            </button>
          </form>
        ) : null}
        {contactMessage ? (
          <p className="auth-message" role="status">
            {contactMessage}
          </p>
        ) : null}
      </article>

      <article className="account-card account-card--preferences">
        <div>
          <p className="eyebrow">Communication</p>
          <h2>Your preferences</h2>
        </div>
        <form
          className="account-preferences-form"
          onSubmit={(event) => void savePreferences(event)}
        >
          <label>
            <input
              type="checkbox"
              checked={marketingEmail}
              onChange={(event) => setMarketingEmail(event.target.checked)}
            />
            <span>
              <strong>Culture notes</strong> Product stories, edits and launches.
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={orderUpdatesSms}
              disabled={!customer.mobileVerified}
              onChange={(event) => setOrderUpdatesSms(event.target.checked)}
            />
            <span>
              <strong>Order updates by SMS</strong> Payment, shipment, delivery, refund and return
              updates.
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={orderUpdatesWhatsapp}
              disabled={!customer.mobileVerified}
              onChange={(event) => setOrderUpdatesWhatsapp(event.target.checked)}
            />
            <span>
              <strong>Order updates on WhatsApp</strong> The same transactional updates in WhatsApp.
            </span>
          </label>
          {!customer.mobileVerified ? (
            <p className="account-form-note">Verify your mobile number to enable mobile updates.</p>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={backInStockEmail}
              onChange={(event) => setBackInStockEmail(event.target.checked)}
            />
            <span>
              <strong>Back-in-stock alerts</strong> Turning this off cancels active alerts.
            </span>
          </label>
          {preferencesMessage ? (
            <p className="auth-message" role="status">
              {preferencesMessage}
            </p>
          ) : null}
          <button
            className="button button--dark"
            type="submit"
            disabled={preferencesState.isLoading}
          >
            {preferencesState.isLoading ? 'Saving…' : 'Save preferences'}
          </button>
        </form>
      </article>

      <article className="account-card account-card--danger">
        <div>
          <p className="eyebrow">Danger zone</p>
          <h2>Deactivate account</h2>
          <p>
            Your profile is disabled and sessions are revoked. Order records are retained. Active
            orders or returns must be resolved first.
          </p>
        </div>
        <form className="auth-form" onSubmit={(event) => void deactivateAccount(event)}>
          <label>
            <span>Reason (optional)</span>
            <input
              value={deactivationReason}
              maxLength={500}
              onChange={(event) => setDeactivationReason(event.target.value)}
            />
          </label>
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={deactivationPassword}
              maxLength={128}
              autoComplete="current-password"
              required
              onChange={(event) => setDeactivationPassword(event.target.value)}
            />
          </label>
          <label>
            <span>Type DEACTIVATE</span>
            <input
              value={deactivationConfirmation}
              autoComplete="off"
              required
              onChange={(event) => setDeactivationConfirmation(event.target.value)}
            />
          </label>
          {deactivationMessage ? (
            <p className="auth-message" role="alert">
              {deactivationMessage}
            </p>
          ) : null}
          <button
            className="button account-danger-button"
            type="submit"
            disabled={deactivateState.isLoading || deactivationConfirmation !== 'DEACTIVATE'}
          >
            {deactivateState.isLoading ? 'Deactivating…' : 'Deactivate account'}
          </button>
        </form>
      </article>
    </>
  );
}
