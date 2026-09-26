import { Link } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';

const principles = [
  [
    '01',
    'Clarity before anything.',
    'Understand what is wrong, what can be repaired and what the proposed work will cost. A good repair starts with a clear conversation.',
  ],
  [
    '02',
    'Your phone. Your decision.',
    'You should have time to consider your options and approve the estimate. Ask about the parts, turnaround and warranty before work begins.',
  ],
  [
    '03',
    'Care beyond the repair.',
    'Check the device at handover, keep your receipt and understand the aftercare advice. The small details matter when you reconnect.',
  ],
];

export function Component() {
  return (
    <>
      <PageMeta
        socialPreview
        title="About iFixer"
        description="The iFixer approach to mobile repair: clear diagnosis, informed decisions and thoughtful care for the phone you use every day."
      />
      <section className="repair-page-heading repair-about-heading">
        <p className="repair-eyebrow">THE IFIXER APPROACH</p>
        <h1>
          Good phones deserve
          <br />a <em>second chapter.</em>
        </h1>
        <p>
          Your phone holds the people, plans and little moments that make up your day. Looking after
          it should feel straightforward.
        </p>
      </section>
      <section className="repair-about-note">
        <span aria-hidden="true">iF</span>
        <div>
          <p className="repair-eyebrow">REPAIR. RECONNECT.</p>
          <h2>
            Care for the connection,
            <br />
            not just the device.
          </h2>
          <p>
            iFixer is built around a simple idea: understand the problem, explain the options and
            treat every repair with care. From a screen that has seen better days to a battery that
            needs a fresh start.
          </p>
        </div>
      </section>
      <section className="repair-section" aria-labelledby="principles-title">
        <header className="repair-section-heading">
          <div>
            <p className="repair-eyebrow">WHAT MATTERS TO US</p>
            <h2 id="principles-title">A thoughtful way to repair.</h2>
          </div>
        </header>
        <div className="repair-card-grid">
          {principles.map(([number, title, copy]) => (
            <article className="repair-principle" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="repair-contact-banner">
        <div>
          <p className="repair-eyebrow">KEEP THE THINGS YOU LOVE</p>
          <h2>Let’s find your next step.</h2>
        </div>
        <Link className="repair-button" to="/services">
          Explore repairs <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
