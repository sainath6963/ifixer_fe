import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import {
  useGetPublicGoogleReviewLinkQuery,
  useRecordGoogleReviewClickMutation,
  useRecordWebsitePageViewMutation,
  type WebsiteEventInput,
} from './website-api';

const visitorKey = 'ifixer.analytics.visitor';
const sessionKey = 'ifixer.analytics.session';
const referrerKey = 'ifixer.analytics.referrer';
let memoryVisitor = '';
let memorySession = '';

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stored(storage: Storage, key: string, fallback: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    storage.setItem(key, fallback);
  } catch {
    // Privacy modes can disable browser storage; memory IDs still count the current page session.
  }
  return fallback;
}

function identity() {
  memoryVisitor ||= randomId();
  memorySession ||= randomId();
  const visitorId = stored(window.localStorage, visitorKey, memoryVisitor);
  const sessionId = stored(window.sessionStorage, sessionKey, memorySession);
  let referrer: string;
  try {
    const existing = window.sessionStorage.getItem(referrerKey);
    if (existing !== null) referrer = existing;
    else {
      referrer = document.referrer;
      window.sessionStorage.setItem(referrerKey, referrer);
    }
  } catch {
    referrer = document.referrer;
  }
  return { visitorId, sessionId, referrer };
}

function eventInput(path: string): WebsiteEventInput {
  return { ...identity(), path, viewportWidth: window.innerWidth };
}

export function WebsiteActivity() {
  const location = useLocation();
  const [recordPageView] = useRecordWebsitePageViewMutation();

  useEffect(() => {
    void recordPageView(eventInput(location.pathname));
  }, [location.pathname, recordPageView]);

  return null;
}

export function GoogleReviewLink({
  className,
  children = 'Review us on Google',
}: {
  className?: string;
  children?: ReactNode;
}) {
  const location = useLocation();
  const review = useGetPublicGoogleReviewLinkQuery();
  const [recordClick] = useRecordGoogleReviewClickMutation();
  const url = review.data?.googleReviewUrl;
  if (!url) return null;
  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void recordClick(eventInput(location.pathname))}
    >
      {children}
    </a>
  );
}

export function GoogleReviewInvitation() {
  const review = useGetPublicGoogleReviewLinkQuery();
  if (!review.data?.googleReviewUrl) return null;
  return (
    <section className="repair-review-invitation" aria-labelledby="google-review-title">
      <p className="repair-eyebrow">YOUR EXPERIENCE MATTERS</p>
      <h2 id="google-review-title">Happy with your repair?</h2>
      <p>Your Google review helps other customers find a repair shop they can trust.</p>
      <GoogleReviewLink className="repair-button repair-button--gold">
        Review iFixer on Google <span aria-hidden="true">↗</span>
      </GoogleReviewLink>
    </section>
  );
}
