export function CatalogSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="product-grid" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-skeleton" key={index} aria-hidden="true">
          <span />
          <i />
        </div>
      ))}
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="inline-feedback" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="text-button" type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
