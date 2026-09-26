import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { PageMeta } from '@/app/components/page-meta';
import { useGetCartQuery, useSetCartItemMutation } from '@/features/cart/cart-api';
import { useGetProductBySlugQuery } from '@/features/catalog/catalog-api';
import { ProductReviewPanel } from '@/features/product-reviews/product-review-panel';
import { ProductSaveActions } from '@/features/wishlist/product-save-actions';
import { apiErrorMessage, formatPrice, formatPriceRange, resolveMediaUrl } from '@/shared/commerce';

export function Component() {
  const { slug = '' } = useParams();
  const productQuery = useGetProductBySlugQuery(slug, { skip: !slug });
  const { data: cartResponse } = useGetCartQuery();
  const [setCartItem, setCartState] = useSetCartItemMutation();
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notice, setNotice] = useState('');

  if (productQuery.isLoading) {
    return (
      <section className="product-detail product-detail--loading" aria-busy="true">
        <div className="product-detail__image-skeleton" />
        <div className="product-detail__copy-skeleton" />
      </section>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <section className="product-state-page">
        <PageMeta
          title="Product unavailable"
          description="This iFixer product is currently unavailable."
          noIndex
        />
        <p className="eyebrow">Product unavailable</p>
        <h1>We could not find this piece.</h1>
        <InlineError
          message="It may have moved or is temporarily unavailable."
          onRetry={() => void productQuery.refetch()}
        />
        <Link className="text-link" to="/catalog">
          Return to collection <span aria-hidden="true">↗</span>
        </Link>
      </section>
    );
  }

  const product = productQuery.data.product;
  const selectedVariant =
    product.variants.find((variant) => variant.variantId === selectedVariantId) ??
    product.variants.find((variant) => variant.availability === 'IN_STOCK') ??
    product.variants[0];
  const displayImage = product.images[activeImage] ?? product.primaryImage;
  const canAdd = selectedVariant?.availability === 'IN_STOCK' && !setCartState.isLoading;

  async function addToBag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVariant) return;
    setNotice('');
    try {
      await setCartItem({
        productId: product.id,
        variantId: selectedVariant.variantId,
        quantity,
        expectedVersion: cartResponse?.cart.version,
      }).unwrap();
      setNotice('Added to your bag.');
    } catch (error) {
      setNotice(apiErrorMessage(error, 'This piece could not be added. Please try again.'));
    }
  }

  return (
    <section className="product-detail">
      <PageMeta
        title={product.name}
        description={product.description.slice(0, 160)}
        image={displayImage ? resolveMediaUrl(displayImage.sources.large) : undefined}
      />
      <div className="product-gallery">
        <div className="product-gallery__main">
          {displayImage ? (
            <img
              src={resolveMediaUrl(displayImage.sources.large)}
              alt={displayImage.altText}
              width={displayImage.width}
              height={displayImage.height}
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <span className="product-gallery__monogram" aria-hidden="true">
              iF
            </span>
          )}
        </div>
        {product.images.length > 1 ? (
          <div className="product-gallery__thumbs" aria-label="Product images">
            {product.images.map((image, index) => (
              <button
                type="button"
                key={image.mediaAssetId}
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === activeImage}
                onClick={() => setActiveImage(index)}
              >
                <img src={resolveMediaUrl(image.sources.thumbnail)} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="product-information">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/catalog">Collection</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        <p className="eyebrow">{product.categories[0]?.name ?? 'iFixer'}</p>
        <h1>{product.name}</h1>
        <p className="product-information__price">
          {selectedVariant
            ? formatPrice(selectedVariant.priceInPaise)
            : formatPriceRange(product.priceRange)}
        </p>
        <p className="product-information__description">{product.description}</p>

        <form className="product-form" onSubmit={(event) => void addToBag(event)}>
          <fieldset>
            <legend>Select an option</legend>
            <div className="variant-options">
              {product.variants.map((variant) => (
                <label
                  key={variant.variantId}
                  data-disabled={variant.availability === 'OUT_OF_STOCK'}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={variant.variantId}
                    checked={selectedVariant?.variantId === variant.variantId}
                    disabled={variant.availability === 'OUT_OF_STOCK'}
                    onChange={() => setSelectedVariantId(variant.variantId)}
                  />
                  <span>{variant.title}</span>
                  {variant.availability === 'OUT_OF_STOCK' ? <small>Sold out</small> : null}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="quantity-field">
            <span>Quantity</span>
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button button--dark product-form__submit"
            type="submit"
            disabled={!canAdd}
          >
            {setCartState.isLoading
              ? 'Adding…'
              : product.availability === 'OUT_OF_STOCK'
                ? 'Sold out'
                : 'Add to bag'}
          </button>
          <div className="form-notice" aria-live="polite">
            {notice}
            {notice === 'Added to your bag.' ? <Link to="/cart"> View bag</Link> : null}
          </div>
        </form>

        <ProductSaveActions product={product} />

        <dl className="product-notes">
          <div>
            <dt>Secure payment</dt>
            <dd>Razorpay checkout</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{product.availability === 'IN_STOCK' ? 'Ready to order' : 'Currently sold out'}</dd>
          </div>
        </dl>
      </div>
      <ProductReviewPanel productId={product.id} />
    </section>
  );
}
