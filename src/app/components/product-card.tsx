import { Link } from 'react-router-dom';

import type { ProductCardView } from '@/features/catalog/catalog.types';
import { formatPriceRange, resolveMediaUrl } from '@/shared/commerce';

export function ProductCard({ product }: { product: ProductCardView }) {
  const image = product.primaryImage;

  return (
    <article className="product-card">
      <Link className="product-card__image" to={`/products/${product.slug}`}>
        {image ? (
          <img
            src={resolveMediaUrl(image.sources.card)}
            alt={image.altText}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="product-card__monogram" aria-hidden="true">
            iF
          </span>
        )}
        {product.availability === 'OUT_OF_STOCK' ? (
          <span className="product-card__status">Sold out</span>
        ) : null}
      </Link>
      <div className="product-card__details">
        <div>
          <p className="product-card__category">{product.categories[0]?.name ?? 'iFixer'}</p>
          <h3>
            <Link to={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>
        <p>{formatPriceRange(product.priceRange)}</p>
      </div>
    </article>
  );
}
