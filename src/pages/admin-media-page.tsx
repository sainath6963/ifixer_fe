import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { ADMIN_IMAGE_ACCEPT, validateAdminImage } from '@/features/admin/admin-image-upload';
import { adminMediaPreview } from '@/features/admin/admin-media';
import {
  useDeleteAdminMediaMutation,
  useGetAdminMediaQuery,
  useUploadAdminImageMutation,
} from '@/features/admin/admin-operations-api';
import { apiErrorMessage } from '@/shared/commerce';

export function Component() {
  const media = useGetAdminMediaQuery({ page: 1, limit: 100, status: 'READY' });
  const [upload, uploadState] = useUploadAdminImageMutation();
  const [remove, removeState] = useDeleteAdminMediaMutation();
  const [file, setFile] = useState<File>();
  const [actionId, setActionId] = useState<string>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setMessage('');
    setErrorMessage('');
    try {
      await upload(file).unwrap();
      setFile(undefined);
      event.currentTarget.reset();
      setMessage('Image validated, normalized and saved to VPS storage.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Image upload failed.'));
    }
  }

  function selectFile(selected: File | undefined) {
    setMessage('');
    const validationMessage = selected ? validateAdminImage(selected) : undefined;
    setErrorMessage(validationMessage ?? '');
    setFile(validationMessage ? undefined : selected);
  }

  async function deleteAsset(assetId: string) {
    setActionId(assetId);
    setMessage('');
    setErrorMessage('');
    try {
      await remove(assetId).unwrap();
      setConfirmDeleteId(undefined);
      setMessage('Unused media asset deleted.');
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, 'This asset may still be used by a product or category.'),
      );
    } finally {
      setActionId(undefined);
    }
  }

  return (
    <section className="admin-page">
      <Link className="admin-back-link" to="/admin/catalog">
        ← Catalog
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">VPS storage</p>
          <h1>Media library</h1>
          <p>Upload product photography and remove only assets that are no longer referenced.</p>
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

      <form className="admin-upload" onSubmit={(event) => void submit(event)}>
        <div>
          <strong>Upload a product image</strong>
          <span>
            JPEG, PNG, WebP or AVIF; maximum 25 MB. Server creates optimized WebP variants.
          </span>
        </div>
        <input
          type="file"
          accept={ADMIN_IMAGE_ACCEPT}
          required
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <button
          className="button button--dark"
          type="submit"
          disabled={!file || uploadState.isLoading}
        >
          {uploadState.isLoading ? 'Uploading…' : 'Upload image'}
        </button>
      </form>

      {media.isLoading ? <div className="admin-table-loading" aria-busy="true" /> : null}
      {media.isError ? (
        <InlineError
          message="Media library could not be loaded."
          onRetry={() => void media.refetch()}
        />
      ) : null}
      {media.data ? (
        <div className="admin-media-grid">
          {media.data.items.map((asset) => (
            <article key={asset.id}>
              <img src={adminMediaPreview(asset)} alt={asset.originalFilename} />
              <div>
                <strong>{asset.originalFilename}</strong>
                <span>
                  {asset.width ?? '—'} × {asset.height ?? '—'} /{' '}
                  {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </span>
                <code>{asset.id}</code>
                {confirmDeleteId === asset.id ? (
                  <div className="admin-actions">
                    <button
                      type="button"
                      disabled={removeState.isLoading && actionId === asset.id}
                      onClick={() => void deleteAsset(asset.id)}
                    >
                      {removeState.isLoading && actionId === asset.id
                        ? 'Deleting…'
                        : 'Confirm delete'}
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(undefined)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDeleteId(asset.id)}>
                    Delete if unused
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
