export function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__line" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}
