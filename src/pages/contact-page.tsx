import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { shopDetails } from '@/config/shop-details';
import { repairServices } from '@/features/repair/repair-content';

export function Component() {
  const [params] = useSearchParams();
  const service = repairServices.find((item) => item.id === params.get('service'));
  const hasContact = Boolean(
    shopDetails.phoneHref || shopDetails.whatsappHref || shopDetails.address,
  );
  const message = service
    ? `Hello iFixer, I would like to ask about ${service.title.toLowerCase()} for my phone.`
    : 'Hello iFixer, I would like to ask about a phone repair.';
  return (
    <>
      <PageMeta
        socialPreview
        title="Contact iFixer"
        description="Get in touch with iFixer about your phone. Find available contact details and learn what to prepare for a repair enquiry."
      />
      <section className="repair-page-heading">
        <p className="repair-eyebrow">LET’S TALK ABOUT YOUR PHONE</p>
        <h1>
          A conversation.
          <br />A <em>clearer next step.</em>
        </h1>
        <p>
          Start with the model and what’s not working. A few details can make all the difference.
        </p>
        <Link
          className="repair-button"
          to={service ? `/book-repair?service=${service.id}` : '/book-repair'}
        >
          Request a repair visit ↗
        </Link>
      </section>
      <section
        className="repair-contact-layout repair-section"
        aria-label="Contact and visit information"
      >
        <div>
          {service ? (
            <div className="repair-enquiry-context">
              <p className="repair-eyebrow">YOUR REPAIR ENQUIRY</p>
              <h2>{service.title}</h2>
              <Link className="repair-text-link" to="/services">
                Choose a different service
              </Link>
            </div>
          ) : null}
          {!hasContact ? (
            <div className="repair-contact-pending">
              <span aria-hidden="true">↗</span>
              <h2>Contact details coming soon.</h2>
              <p>
                Our phone number and shop location will be available here. Please check back before
                planning a visit.
              </p>
              <Link className="repair-text-link" to="/services#questions">
                Read the repair FAQs <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            <div className="repair-contact-options">
              {shopDetails.phoneHref ? (
                <a href={shopDetails.phoneHref}>
                  <span>CALL IFIXER</span>
                  <strong>{shopDetails.phone}</strong>
                  <span>Talk about your repair ↗</span>
                </a>
              ) : null}
              {shopDetails.whatsappHref ? (
                <a
                  href={`${shopDetails.whatsappHref}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>WHATSAPP</span>
                  <strong>Start a conversation</strong>
                  <span>Share your model and issue ↗</span>
                </a>
              ) : null}
              {shopDetails.address ? (
                <div>
                  <span>VISIT THE SHOP</span>
                  <address>{shopDetails.address}</address>
                  {shopDetails.mapUrl ? (
                    <a
                      className="repair-text-link"
                      href={shopDetails.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          {shopDetails.hours ? (
            <div className="repair-contact-hours">
              <p className="repair-eyebrow">SHOP HOURS</p>
              <p>{shopDetails.hours}</p>
            </div>
          ) : null}
        </div>
        <aside className="repair-visit-guide">
          <p className="repair-eyebrow">BEFORE WE TALK</p>
          <h2>
            A few things
            <br />
            to have handy.
          </h2>
          <ol>
            <li>
              <strong>Your phone model</strong>
              <p>The brand and exact model help identify compatible parts.</p>
            </li>
            <li>
              <strong>What you’ve noticed</strong>
              <p>When did it start? Is it constant? Mention any drop or liquid exposure.</p>
            </li>
            <li>
              <strong>Any previous repairs</strong>
              <p>A little history helps with the assessment.</p>
            </li>
          </ol>
          <p className="repair-visit-guide__note">
            Keep your passwords private. Back up your data if your phone allows it.
          </p>
        </aside>
      </section>
    </>
  );
}
