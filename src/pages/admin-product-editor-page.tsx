import { type FormEvent, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import {
  adminIdempotencyKey,
  attributesFromText,
  attributesToText,
  paiseToRupees,
  rupeesToPaise,
} from '@/features/admin/admin-form-utils';
import { ADMIN_IMAGE_ACCEPT, validateAdminImage } from '@/features/admin/admin-image-upload';
import { adminMediaPreview } from '@/features/admin/admin-media';
import {
  useAddAdminProductVariantMutation,
  useAdjustAdminInventoryMutation,
  useCreateAdminProductMutation,
  useGetAdminCategoriesQuery,
  useGetAdminMediaQuery,
  useGetAdminProductQuery,
  useReplaceAdminProductImagesMutation,
  useUpdateAdminProductMutation,
  useUpdateAdminProductVariantMutation,
  useUploadAdminImageMutation,
} from '@/features/admin/admin-operations-api';
import type {
  AdminCategory,
  AdminProduct,
  AdminProductVariant,
  ProductStatus,
  ProductVariantInput,
} from '@/features/admin/admin.types';
import { apiErrorMessage } from '@/shared/commerce';

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function integer(data: FormData, name: string, fallback = 0): number {
  const value = Number(text(data, name));
  return Number.isSafeInteger(value) ? value : fallback;
}

function categoryIds(data: FormData): string[] {
  return data
    .getAll('categoryIds')
    .filter((value): value is string => typeof value === 'string' && Boolean(value));
}

function variantInput(data: FormData): ProductVariantInput | undefined {
  const priceInPaise = rupeesToPaise(text(data, 'price'));
  const compareText = text(data, 'compareAtPrice');
  const compareAtPriceInPaise = compareText ? rupeesToPaise(compareText) : undefined;
  if (priceInPaise === undefined || (compareText && compareAtPriceInPaise === undefined)) {
    return undefined;
  }
  return {
    sku: text(data, 'sku').toUpperCase(),
    title: text(data, 'variantTitle'),
    attributes: attributesFromText(text(data, 'attributes')),
    priceInPaise,
    ...(compareAtPriceInPaise === undefined ? {} : { compareAtPriceInPaise }),
    isActive: data.get('isActive') === 'on',
    sortOrder: integer(data, 'variantSortOrder'),
    initialOnHand: integer(data, 'initialOnHand'),
    reorderPoint: integer(data, 'reorderPoint'),
  };
}

export function Component() {
  const { productId } = useParams();
  const isNew = !productId || productId === 'new';
  const product = useGetAdminProductQuery(productId ?? '', { skip: isNew });
  const categories = useGetAdminCategoriesQuery({ page: 1, limit: 100 });

  if (categories.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (categories.isError) {
    return (
      <section className="admin-page">
        <InlineError
          message="Categories must load before this product can be edited safely."
          onRetry={() => void categories.refetch()}
        />
      </section>
    );
  }
  if (!isNew && product.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (!isNew && (product.isError || !product.data)) {
    return (
      <section className="admin-page">
        <InlineError
          message="Product could not be loaded."
          onRetry={() => void product.refetch()}
        />
      </section>
    );
  }

  return (
    <ProductEditor
      key={product.data ? `${product.data.product.id}:${product.data.product.version}` : 'new'}
      product={product.data?.product}
      categories={categories.data?.items ?? []}
    />
  );
}

function ProductEditor({
  product,
  categories,
}: {
  product?: AdminProduct;
  categories: AdminCategory[];
}) {
  const navigate = useNavigate();
  const [create, createState] = useCreateAdminProductMutation();
  const [update, updateState] = useUpdateAdminProductMutation();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const busy = createState.isLoading || updateState.isLoading;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage('');
    setErrorMessage('');

    try {
      if (!product) {
        const initialVariant = variantInput(data);
        if (!initialVariant) {
          setErrorMessage('Enter valid rupee prices with no more than two decimal places.');
          return;
        }
        const response = await create({
          name: text(data, 'name'),
          slug: text(data, 'slug'),
          description: text(data, 'description'),
          categoryIds: categoryIds(data),
          tags: text(data, 'tags')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          variants: [initialVariant],
        }).unwrap();
        await navigate(`/admin/catalog/products/${response.product.id}`, { replace: true });
        return;
      }

      const nextStatus = text(data, 'status') as ProductStatus;
      if (
        nextStatus === 'ARCHIVED' &&
        product.status !== 'ARCHIVED' &&
        data.get('confirmArchive') !== 'on'
      ) {
        setErrorMessage('Tick the archive confirmation before permanently archiving this product.');
        return;
      }
      await update({
        productId: product.id,
        expectedVersion: product.version,
        name: text(data, 'name'),
        slug: text(data, 'slug'),
        description: text(data, 'description'),
        categoryIds: categoryIds(data),
        tags: text(data, 'tags')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: nextStatus,
        isFeatured: nextStatus === 'ACTIVE' && data.get('isFeatured') === 'on',
      }).unwrap();
      setMessage('Product details saved.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Product could not be saved. Refresh and retry.'));
    }
  }

  const readOnly = product?.status === 'ARCHIVED';

  return (
    <section className="admin-page">
      <Link className="admin-back-link" to="/admin/catalog">
        ← Products
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">{product ? product.status : 'New draft'}</p>
          <h1>{product?.name ?? 'Create product'}</h1>
          <p>
            {product
              ? 'Edit storefront content, variants, stock and ordered product photography.'
              : 'Start with the product and its first sellable variant.'}
          </p>
        </div>
      </header>

      {message ? (
        <p className="admin-alert admin-alert--success" role="status">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="admin-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form className="admin-editor-form" onSubmit={(event) => void save(event)}>
        <div className="admin-editor-form__main">
          <label>
            <span>Product name</span>
            <input name="name" defaultValue={product?.name} maxLength={180} required />
          </label>
          <label>
            <span>URL slug</span>
            <input
              name="slug"
              defaultValue={product?.slug}
              maxLength={220}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="linen-shirt"
              required
            />
          </label>
          <label className="admin-editor-form__wide">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={product?.description}
              maxLength={5000}
              rows={8}
              required
            />
          </label>
          <label className="admin-editor-form__wide">
            <span>Categories</span>
            <select name="categoryIds" defaultValue={product?.categoryIds} multiple size={5}>
              {categories
                .filter(({ status }) => status !== 'ARCHIVED')
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.status})
                  </option>
                ))}
            </select>
            <small>Use Ctrl/Cmd to select multiple categories.</small>
          </label>
          <label className="admin-editor-form__wide">
            <span>Tags, comma separated</span>
            <input name="tags" defaultValue={product?.tags.join(', ')} maxLength={1000} />
          </label>
        </div>

        {!product ? <InitialVariantFields /> : null}

        {product ? (
          <aside className="admin-editor-form__status">
            <label>
              <span>Status</span>
              <select name="status" defaultValue={product.status} disabled={readOnly}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="admin-check-field">
              <input
                name="isFeatured"
                type="checkbox"
                defaultChecked={product.isFeatured}
                disabled={readOnly}
              />
              Feature on storefront
            </label>
            {product.status !== 'ARCHIVED' ? (
              <label className="admin-check-field admin-check-field--danger">
                <input name="confirmArchive" type="checkbox" />I understand archived products cannot
                be restored
              </label>
            ) : null}
            <span>Version {product.version}</span>
          </aside>
        ) : null}

        <button className="button button--dark" type="submit" disabled={busy || readOnly}>
          {busy ? 'Saving…' : product ? 'Save product details' : 'Create draft product'}
        </button>
      </form>

      {product && !readOnly ? (
        <>
          <ProductImagesPanel key={`images-${product.version}`} product={product} />
          <ProductVariantsPanel product={product} />
        </>
      ) : null}
    </section>
  );
}

function InitialVariantFields() {
  return (
    <fieldset className="admin-editor-fieldset">
      <legend>First variant</legend>
      <VariantFields includeInventory />
    </fieldset>
  );
}

function VariantFields({
  variant,
  includeInventory,
}: {
  variant?: AdminProductVariant;
  includeInventory?: boolean;
}) {
  return (
    <div className="admin-variant-fields">
      <label>
        <span>SKU</span>
        <input name="sku" defaultValue={variant?.sku} maxLength={100} required />
      </label>
      <label>
        <span>Variant title</span>
        <input name="variantTitle" defaultValue={variant?.title} maxLength={160} required />
      </label>
      <label>
        <span>Price ₹</span>
        <input
          name="price"
          inputMode="decimal"
          defaultValue={paiseToRupees(variant?.priceInPaise)}
          pattern="\d+(?:\.\d{1,2})?"
          required
        />
      </label>
      <label>
        <span>Compare-at ₹</span>
        <input
          name="compareAtPrice"
          inputMode="decimal"
          defaultValue={paiseToRupees(variant?.compareAtPriceInPaise)}
          pattern="\d+(?:\.\d{1,2})?"
        />
      </label>
      <label className="admin-variant-fields__wide">
        <span>Attributes — e.g. color: Brown, size: XL</span>
        <input
          name="attributes"
          defaultValue={variant ? attributesToText(variant.attributes) : ''}
          maxLength={1000}
        />
      </label>
      <label>
        <span>Sort order</span>
        <input
          name="variantSortOrder"
          type="number"
          min={0}
          defaultValue={variant?.sortOrder ?? 0}
        />
      </label>
      {includeInventory ? (
        <>
          <label>
            <span>Initial stock</span>
            <input name="initialOnHand" type="number" min={0} defaultValue={0} />
          </label>
          <label>
            <span>Reorder point</span>
            <input name="reorderPoint" type="number" min={0} defaultValue={0} />
          </label>
        </>
      ) : null}
      <label className="admin-check-field">
        <input name="isActive" type="checkbox" defaultChecked={variant?.isActive ?? true} />
        Active variant
      </label>
    </div>
  );
}

function ProductVariantsPanel({ product }: { product: AdminProduct }) {
  return (
    <section className="admin-editor-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Sellable options</p>
          <h2>Variants & inventory</h2>
        </div>
      </div>
      <div className="admin-variant-list">
        {product.variants.map((variant) => (
          <VariantEditor key={variant.variantId} product={product} variant={variant} />
        ))}
      </div>
      <AddVariantForm product={product} />
    </section>
  );
}

function VariantEditor({
  product,
  variant,
}: {
  product: AdminProduct;
  variant: AdminProductVariant;
}) {
  const [update, updateState] = useUpdateAdminProductVariantMutation();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const inventory = product.inventory?.find(({ variantId }) => variantId === variant.variantId);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = variantInput(data);
    if (!values) {
      setErrorMessage('Enter valid variant prices.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    try {
      await update({
        productId: product.id,
        variantId: variant.variantId,
        expectedProductVersion: product.version,
        sku: values.sku,
        title: values.title,
        attributes: values.attributes,
        priceInPaise: values.priceInPaise,
        ...(values.compareAtPriceInPaise === undefined
          ? {}
          : { compareAtPriceInPaise: values.compareAtPriceInPaise }),
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      }).unwrap();
      setMessage('Variant saved.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Variant could not be saved.'));
    }
  }

  return (
    <article className="admin-variant-card">
      <div className="admin-variant-card__heading">
        <div>
          <strong>{variant.title}</strong>
          <span>{variant.sku}</span>
        </div>
        <span className="admin-badge" data-status={variant.isActive ? 'ACTIVE' : 'DRAFT'}>
          {variant.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {message ? <p className="admin-inline-success">{message}</p> : null}
      {errorMessage ? <p className="admin-inline-error">{errorMessage}</p> : null}
      <form onSubmit={(event) => void save(event)}>
        <VariantFields variant={variant} />
        <button className="button" type="submit" disabled={updateState.isLoading}>
          {updateState.isLoading ? 'Saving…' : 'Save variant'}
        </button>
      </form>
      {inventory ? <InventoryAdjustmentForm productId={product.id} inventory={inventory} /> : null}
    </article>
  );
}

function AddVariantForm({ product }: { product: AdminProduct }) {
  const [add, addState] = useAddAdminProductVariantMutation();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = variantInput(new FormData(event.currentTarget));
    if (!values) {
      setErrorMessage('Enter valid variant prices.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    try {
      await add({
        productId: product.id,
        expectedProductVersion: product.version,
        ...values,
      }).unwrap();
      event.currentTarget.reset();
      setMessage('Variant and inventory level created.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Variant could not be added.'));
    }
  }

  return (
    <form className="admin-add-variant" onSubmit={(event) => void submit(event)}>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">New option</p>
          <h2>Add variant</h2>
        </div>
      </div>
      {message ? <p className="admin-inline-success">{message}</p> : null}
      {errorMessage ? <p className="admin-inline-error">{errorMessage}</p> : null}
      <VariantFields includeInventory />
      <button className="button button--dark" type="submit" disabled={addState.isLoading}>
        {addState.isLoading ? 'Adding…' : 'Add variant'}
      </button>
    </form>
  );
}

function InventoryAdjustmentForm({
  productId,
  inventory,
}: {
  productId: string;
  inventory: NonNullable<AdminProduct['inventory']>[number];
}) {
  const [adjust, adjustState] = useAdjustAdminInventoryMutation();
  const request = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const deltaOnHand = integer(data, 'deltaOnHand');
    const note = text(data, 'inventoryNote');
    if (!deltaOnHand || note.length < 1) {
      setErrorMessage('Enter a non-zero stock change and an audit note.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    const fingerprint = `${deltaOnHand}:${note}`;
    if (request.current?.fingerprint !== fingerprint) {
      request.current = { fingerprint, key: adminIdempotencyKey('inventory') };
    }
    try {
      const response = await adjust({
        productId,
        variantId: inventory.variantId,
        deltaOnHand,
        note,
        idempotencyKey: request.current.key,
      }).unwrap();
      request.current = undefined;
      event.currentTarget.reset();
      setMessage(`Stock updated. Available: ${response.inventory.available}.`);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Inventory adjustment failed. Retry is safe.'));
    }
  }

  return (
    <div className="admin-inventory-box">
      <dl>
        <div>
          <dt>On hand</dt>
          <dd>{inventory.onHand}</dd>
        </div>
        <div>
          <dt>Reserved</dt>
          <dd>{inventory.reserved}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd>{inventory.available}</dd>
        </div>
        <div>
          <dt>Sold</dt>
          <dd>{inventory.sold}</dd>
        </div>
      </dl>
      {message ? <p className="admin-inline-success">{message}</p> : null}
      {errorMessage ? <p className="admin-inline-error">{errorMessage}</p> : null}
      <form onSubmit={(event) => void submit(event)}>
        <label>
          <span>Stock change (+ / −)</span>
          <input name="deltaOnHand" type="number" step={1} required />
        </label>
        <label>
          <span>Audit note</span>
          <input
            name="inventoryNote"
            maxLength={500}
            placeholder="Received supplier stock"
            required
          />
        </label>
        <button type="submit" disabled={adjustState.isLoading}>
          {adjustState.isLoading ? 'Applying…' : 'Apply adjustment'}
        </button>
      </form>
    </div>
  );
}

function ProductImagesPanel({ product }: { product: AdminProduct }) {
  const media = useGetAdminMediaQuery({ page: 1, limit: 100, status: 'READY' });
  const [upload, uploadState] = useUploadAdminImageMutation();
  const [replace, replaceState] = useReplaceAdminProductImagesMutation();
  const [images, setImages] = useState(product.images);
  const [file, setFile] = useState<File>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const assets = new Map(media.data?.items.map((asset) => [asset.id, asset]) ?? []);

  function addAsset(mediaAssetId: string) {
    if (images.some((image) => image.mediaAssetId === mediaAssetId)) return;
    if (images.length >= 12) {
      setErrorMessage('A product can contain at most 12 images.');
      return;
    }
    setImages((current) => [
      ...current,
      {
        mediaAssetId,
        altText: product.name,
        isPrimary: current.length === 0,
        sortOrder: current.length,
      },
    ]);
  }

  function removeAsset(mediaAssetId: string) {
    setImages((current) => {
      const remaining = current.filter((image) => image.mediaAssetId !== mediaAssetId);
      if (remaining.length && !remaining.some(({ isPrimary }) => isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return remaining.map((image, index) => ({ ...image, sortOrder: index }));
    });
  }

  function move(mediaAssetId: string, direction: -1 | 1) {
    setImages((current) => {
      const from = current.findIndex((image) => image.mediaAssetId === mediaAssetId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next.map((image, index) => ({ ...image, sortOrder: index }));
    });
  }

  async function uploadAndAdd() {
    if (!file) return;
    if (images.length >= 12) {
      setErrorMessage('Remove an image before uploading another one.');
      return;
    }
    setMessage('');
    setErrorMessage('');
    try {
      const response = await upload(file).unwrap();
      addAsset(response.media.id);
      setFile(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Image uploaded. Save the ordered image set to attach it.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Image upload failed.'));
    }
  }

  function selectUpload(selected: File | undefined) {
    setMessage('');
    const validationMessage = selected ? validateAdminImage(selected) : undefined;
    setErrorMessage(validationMessage ?? '');
    setFile(validationMessage ? undefined : selected);
  }

  async function saveImages() {
    setMessage('');
    setErrorMessage('');
    try {
      await replace({
        productId: product.id,
        expectedProductVersion: product.version,
        images,
      }).unwrap();
      setMessage('Product images saved.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Product images could not be saved.'));
    }
  }

  return (
    <section className="admin-editor-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Photography</p>
          <h2>Product images</h2>
        </div>
        <Link to="/admin/catalog/media">Open media library ↗</Link>
      </div>
      {message ? <p className="admin-inline-success">{message}</p> : null}
      {errorMessage ? <p className="admin-inline-error">{errorMessage}</p> : null}
      <div className="admin-product-images">
        {images.map((image, index) => {
          const asset = assets.get(image.mediaAssetId);
          return (
            <article key={image.mediaAssetId}>
              {asset ? (
                <img src={adminMediaPreview(asset)} alt="" />
              ) : (
                <div className="admin-media-missing">Loading…</div>
              )}
              <label>
                <span>Alt text</span>
                <input
                  value={image.altText ?? ''}
                  maxLength={180}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item) =>
                        item.mediaAssetId === image.mediaAssetId
                          ? { ...item, altText: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="admin-check-field">
                <input
                  type="radio"
                  name="primaryProductImage"
                  checked={image.isPrimary}
                  onChange={() =>
                    setImages((current) =>
                      current.map((item) => ({
                        ...item,
                        isPrimary: item.mediaAssetId === image.mediaAssetId,
                      })),
                    )
                  }
                />{' '}
                Primary
              </label>
              <div className="admin-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(image.mediaAssetId, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === images.length - 1}
                  onClick={() => move(image.mediaAssetId, 1)}
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeAsset(image.mediaAssetId)}>
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="admin-image-library">
        <label>
          <span>Add from media library</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) addAsset(event.target.value);
              event.target.value = '';
            }}
          >
            <option value="">Select an image</option>
            {media.data?.items
              .filter((asset) => !images.some((image) => image.mediaAssetId === asset.id))
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalFilename}
                </option>
              ))}
          </select>
        </label>
        <span>or</span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ADMIN_IMAGE_ACCEPT}
          onChange={(event) => selectUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={!file || uploadState.isLoading}
          onClick={() => void uploadAndAdd()}
        >
          {uploadState.isLoading ? 'Uploading…' : 'Upload & add'}
        </button>
      </div>
      <button
        className="button button--dark"
        type="button"
        disabled={replaceState.isLoading}
        onClick={() => void saveImages()}
      >
        {replaceState.isLoading ? 'Saving…' : 'Save ordered images'}
      </button>
    </section>
  );
}
