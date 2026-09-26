import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

import { PageMeta } from './page-meta';

export function RouteErrorPage() {
  const error = useRouteError();
  const title =
    isRouteErrorResponse(error) && error.status === 404
      ? 'Page not found.'
      : 'A page failed to load.';

  return (
    <main className="fatal-error" role="alert">
      <PageMeta
        title={title.replace(/\.$/, '')}
        description="The requested iFixer experience is unavailable."
        noIndex
      />
      <p className="eyebrow">iFixer</p>
      <h1>{title}</h1>
      <p>The requested experience is unavailable right now.</p>
      <Link className="button button--dark" to="/">
        Return home
      </Link>
    </main>
  );
}
