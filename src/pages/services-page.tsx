import { Link } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { repairQuestions, repairServices } from '@/features/repair/repair-content';
import { useRepairCatalogQuery } from '@/features/repair-bookings/repair-api';
import { repairPrice } from '@/features/repair-bookings/repair-utils';

export function Component() {
  const catalog = useRepairCatalogQuery();
  return (
    <>
      <PageMeta
        socialPreview
        title="Repair services"
        description="Explore iFixer screen, battery, charging, audio and camera repair services. Understand diagnosis, repair options and what to ask before a repair."
      />
      <section className="repair-page-heading">
        <p className="repair-eyebrow">CARE FOR YOUR EVERYDAY COMPANION</p>
        <h1>
          Find the right <em>repair.</em>
        </h1>
        <p>
          From a cracked screen to a battery that’s lost its spark. Start with the issue. We’ll
          explain what to consider next.
        </p>
        <nav className="repair-jump-links" aria-label="Repair categories">
          {repairServices.map((service) => (
            <a href={'#' + service.id} key={service.id}>
              {service.title} <span aria-hidden="true">↘</span>
            </a>
          ))}
        </nav>
      </section>
      <section className="repair-section repair-services" aria-label="Repair service details">
        <section className="repair-live-services" aria-label="Bookable repair services">
          <p className="repair-eyebrow">PLAN YOUR VISIT</p>
          <h2>Services for your phone</h2>
          {catalog.isLoading && <p role="status">Loading current services…</p>}
          {catalog.isError && (
            <p>
              Current service options could not load.{' '}
              <button className="repair-text-link" onClick={() => void catalog.refetch()}>
                Try again
              </button>
            </p>
          )}
          {catalog.data?.services.map((service) => (
            <article className="repair-live-service" key={service.id}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p>
                {service.pricingMode === 'INDICATIVE'
                  ? `Indicative estimate: ${repairPrice(service.priceInPaise)}. Your exact model may have a different estimate.`
                  : 'Diagnosis required before a quote.'}
              </p>
              <Link className="repair-text-link" to={`/book-repair?service=${service.slug}`}>
                Request {service.name} ↗
              </Link>
            </article>
          ))}
          {catalog.data && !catalog.data.services.length && (
            <p>
              Tell us about your phone using Other issue / diagnosis. The shop will review repair
              availability for your model.
            </p>
          )}
          {catalog.data && catalog.data.brands.length > 0 && (
            <p className="repair-price-note">
              Device brands in our catalog:{' '}
              {catalog.data.brands.map((brand) => brand.name).join(', ')}. Exact service
              compatibility is shown in the booking form.
            </p>
          )}
          <Link className="repair-button" to="/book-repair">
            Request a repair visit ↗
          </Link>
        </section>
        <div className="repair-detail-grid">
          {repairServices.map((service, index) => (
            <article className="repair-detail-card" id={service.id} key={service.id}>
              <div className="repair-service-card__top">
                <span
                  className={'repair-symbol repair-symbol--' + service.icon}
                  aria-hidden="true"
                />
                <span>0{index + 1}</span>
              </div>
              <h2>{service.title}</h2>
              <p className="repair-detail-card__issue">{service.issue}</p>
              <p>{service.detail}</p>
              <Link className="repair-text-link" to={'/contact?service=' + service.id}>
                Discuss this repair <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
        <div className="repair-info-note">
          <span aria-hidden="true">✦</span>
          <p>
            <strong>Your model makes a difference.</strong> Parts, repair feasibility and estimates
            are confirmed after assessment. No one-size-fits-all promises.
          </p>
        </div>
      </section>
      <section
        className="repair-faq repair-section"
        id="questions"
        aria-labelledby="questions-title"
      >
        <div>
          <p className="repair-eyebrow">A LITTLE CLARITY</p>
          <h2 id="questions-title">
            Before you
            <br />
            bring it in.
          </h2>
          <p>A few answers to help you prepare.</p>
        </div>
        <div>
          {repairQuestions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="repair-contact-banner">
        <div>
          <p className="repair-eyebrow">LET’S START WITH YOUR PHONE</p>
          <h2>Not sure where to begin?</h2>
        </div>
        <Link className="repair-button" to="/contact">
          Contact iFixer <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
