import { Link } from 'react-router-dom';

import { PageMeta } from '@/app/components/page-meta';

export function Component() {
  return (
    <section className="placeholder-page">
      <PageMeta
        title="Page not found"
        description="The requested iFixer page could not be found."
        noIndex
      />
      <p className="eyebrow">404</p>
      <h1>This page is outside the collection.</h1>
      <Link className="text-link" to="/">
        Return home <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
