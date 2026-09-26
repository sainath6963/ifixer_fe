import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { BookingForm } from '@/features/repair-bookings/booking-form';
export function Component() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  return (
    <>
      <PageMeta
        title="Book a repair"
        description="Tell iFixer about your phone and request a repair visit. Appointment times are confirmed by the shop."
      />
      <section className="repair-page-heading">
        <p className="repair-eyebrow">LET’S GET STARTED</p>
        <h1>
          A little detail.
          <br />
          <em>A clearer plan.</em>
        </h1>
        <p>Tell us about your phone. We’ll review your request and confirm the next step.</p>
      </section>
      <section className="repair-section repair-booking-layout">
        <BookingForm initialService={params.get('service') ?? ''} />
        <aside className="repair-visit-guide">
          <p className="repair-eyebrow">WHAT HAPPENS NEXT</p>
          <h2>
            Request. Review.
            <br />
            Repair.
          </h2>
          <ol>
            <li>Save your booking reference and private access code.</li>
            <li>The shop reviews your issue and preferred visit time.</li>
            <li>Check your booking for confirmation. Diagnosis comes before a final quote.</li>
          </ol>
          <p>No online payment is required to send a request.</p>
          <form
            className="repair-access-form repair-booking-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate(`/book-repair/${reference}`);
            }}
          >
            <label className="repair-field">
              Already booked? Enter your reference
              <input
                required
                pattern="IFX-[A-F0-9]{16}"
                maxLength={20}
                value={reference}
                onChange={(event) => setReference(event.target.value.trim().toUpperCase())}
              />
            </label>
            <button className="repair-secondary-button">Find my booking</button>
            <p className="repair-price-note">
              You will also need the private access code given after submission, or your linked
              account.
            </p>
          </form>
        </aside>
      </section>
    </>
  );
}
