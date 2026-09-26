import { useState } from 'react';
import { PageMeta } from '@/app/components/page-meta';
import { useRepairTeamQuery, useSaveRepairMemberMutation } from '@/features/repair-jobs/job-api';
import { repairError } from '@/features/repair-bookings/repair-utils';
export function Component() {
  const query = useRepairTeamQuery();
  const [save, mutation] = useSaveRepairMemberMutation();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <section className="admin-page">
      <PageMeta
        noIndex
        title="Repair team"
        description="Owner-managed reception and technician accounts."
      />
      <p className="repair-eyebrow">OWNER SETTINGS</p>
      <h1>Repair team</h1>
      <p>
        Reception manages intake, estimates and handover. Technicians see only assigned jobs and can
        record diagnosis, repair progress and tests.
      </p>
      {query.isError && <p role="alert">{repairError(query.error)}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="repair-job-list">
        {query.data?.map((member) => (
          <article className="repair-job-card" key={member.id}>
            <h2>{member.name}</h2>
            <p>{member.email}</p>
            <p>
              {member.roles.join(' / ')} · {member.status}
            </p>
            <button
              disabled={mutation.isLoading}
              onClick={() => {
                setError('');
                void save({
                  id: member.id,
                  body: {
                    expectedVersion: member.version,
                    status: member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                  },
                })
                  .unwrap()
                  .then(() => setNotice('Team member updated.'))
                  .catch((failure: unknown) => setError(repairError(failure)));
              }}
            >
              {member.status === 'ACTIVE' ? 'Disable access' : 'Enable access'}
            </button>
          </article>
        ))}
      </div>
      <form
        className="repair-booking-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          setError('');
          setNotice('');
          void save({ body: Object.fromEntries(data) })
            .unwrap()
            .then(() => {
              form.reset();
              setNotice(
                'Account created. Share the sign-in details privately; the member can change their password under Security.',
              );
            })
            .catch((failure: unknown) => setError(repairError(failure)));
        }}
      >
        <h2>Add team member</h2>
        <fieldset disabled={mutation.isLoading}>
          <legend>New account</legend>
          <label className="repair-field">
            Name
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <label className="repair-field">
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="off" />
          </label>
          <label className="repair-field">
            Role
            <select name="role">
              <option value="TECHNICIAN">Technician</option>
              <option value="RECEPTION">Reception</option>
            </select>
          </label>
          <label className="repair-field">
            Initial password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <button className="repair-button">Create account</button>
        </fieldset>
      </form>
    </section>
  );
}
