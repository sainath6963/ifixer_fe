import { WorkshopReels } from '@/features/instagram-reels/workshop-reels';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { GoogleReviewInvitation } from '@/features/website/website-activity';

const repairs = [
  {
    number: '01',
    name: 'Screen & display',
    copy: 'Cracks, lines or a touch screen that won’t respond.',
    to: 'screen',
    icon: 'screen',
  },
  {
    number: '02',
    name: 'Battery replacement',
    copy: 'For batteries that drain too quickly or won’t hold a charge.',
    to: 'battery',
    icon: 'battery',
  },
  {
    number: '03',
    name: 'Charging & power',
    copy: 'Loose connections, charging trouble or a phone that won’t turn on.',
    to: 'charging',
    icon: 'charging',
  },
];

export function Component() {
  return (
    <>
      <PageMeta
        socialPreview
        title="iFixer"
        description="Give your phone a fresh start. Explore screen, battery and charging repairs, and learn what to expect from iFixer."
      />
      <section className="repair-hero" aria-labelledby="repair-home-title">
        <div className="repair-hero__copy">
          <p className="repair-eyebrow">
            <span /> MOBILE REPAIR, WITH CARE
          </p>
          <h1 id="repair-home-title">
            A fresh start
            <br />
            for your <em>phone.</em>
          </h1>
          <p className="repair-intro">
            Life happens. Screens crack. Batteries tire.
            <br className="desktop-break" /> Let’s get you back to the things that matter.
          </p>
          <div className="repair-actions">
            <Link className="repair-button" to="/services">
              Explore repairs <span aria-hidden="true">↗</span>
            </Link>
            <a className="repair-text-link" href="#how-it-works">
              How it works <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="repair-hero__note">
            <span aria-hidden="true">✦</span>
            <p>A clear diagnosis. Your approval. Then the repair.</p>
          </div>
        </div>
        <div
          className="phone-scene"
          role="img"
          aria-label="Illustration of a phone with a fresh green and gold screen"
        >
          <span className="phone-scene__label">A LITTLE CARE. A LONGER LIFE.</span>
          <div className="phone-scene__orbit phone-scene__orbit--one" />
          <div className="phone-scene__orbit phone-scene__orbit--two" />
          <div className="repair-phone">
            <div className="repair-phone__camera" />
            <div className="repair-phone__screen">
              <span className="repair-phone__brand">iFixer</span>
              <div className="repair-phone__art" />
              <p>
                Back to
                <br />
                <em>what matters.</em>
              </p>
              <span className="repair-phone__bottom">REPAIR. RECONNECT.</span>
            </div>
          </div>
          <span className="phone-scene__chip phone-scene__chip--screen">
            <span className="repair-symbol repair-symbol--screen" />
            Screen care
          </span>
          <span className="phone-scene__chip phone-scene__chip--battery">
            <span className="repair-symbol repair-symbol--battery" />
            New energy
          </span>
          <div className="phone-scene__footer">
            <span>THOUGHTFUL REPAIRS</span>
            <span aria-hidden="true">↗</span>
          </div>
        </div>
      </section>
      <div className="repair-values" aria-label="Our repair approach">
        <span>Understand the problem</span>
        <span aria-hidden="true">✦</span>
        <span>Know your options</span>
        <span aria-hidden="true">✦</span>
        <span>Approve the repair</span>
        <span aria-hidden="true">✦</span>
        <span>Reconnect with your day</span>
      </div>
      <section className="repair-section" id="repairs" aria-labelledby="repairs-title">
        <header className="repair-section-heading">
          <div>
            <p className="repair-eyebrow">SMALL FIXES. BIG DIFFERENCE.</p>
            <h2 id="repairs-title">What needs a little care?</h2>
          </div>
          <Link className="repair-text-link" to="/services">
            All repair services <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <div className="repair-card-grid">
          {repairs.map((repair) => (
            <Link className="repair-service-card" to={'/services#' + repair.to} key={repair.to}>
              <div className="repair-service-card__top">
                <span className={'repair-symbol repair-symbol--' + repair.icon} />
                <span>{repair.number}</span>
              </div>
              <h3>{repair.name}</h3>
              <p>{repair.copy}</p>
              <span className="repair-service-card__link">
                Explore this repair <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section
        className="repair-process repair-section"
        id="how-it-works"
        aria-labelledby="process-title"
      >
        <div>
          <p className="repair-eyebrow">FROM PROBLEM TO POSSIBILITY</p>
          <h2 id="process-title">
            A repair process
            <br />
            you can follow.
          </h2>
          <Link className="repair-text-link" to="/about">
            Meet the iFixer approach <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ol>
          {[
            [
              'Tell us what’s wrong',
              'Start with your phone model and what you’ve noticed. Every detail helps.',
            ],
            [
              'Understand your options',
              'A diagnosis comes first. Review the proposed work and estimate before deciding.',
            ],
            [
              'Back to your everyday',
              'Once the repair is complete, check the phone and review the aftercare advice.',
            ],
          ].map(([title, copy], index) => (
            <li key={title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <WorkshopReels />
      <GoogleReviewInvitation />
      <section className="repair-closing">
        <p className="repair-eyebrow">KEEP THE CONNECTION</p>
        <h2>
          More life in the phone
          <br />
          you already <em>love.</em>
        </h2>
        <Link className="repair-button repair-button--gold" to="/services">
          Find your repair <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
