import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { InlineError } from '@/app/components/catalog-feedback';
import { slugifyAdminValue } from '@/features/admin/admin-form-utils';
import { AdminMediaPicker } from '@/features/admin/admin-media-picker';
import {
  useCreateAdminCategoryMutation,
  useGetAdminCategoriesQuery,
  useGetAdminCategoryQuery,
  useUpdateAdminCategoryMutation,
} from '@/features/admin/admin-operations-api';
import type { AdminCategory, ProductStatus } from '@/features/admin/admin.types';
import { apiErrorMessage } from '@/shared/commerce';

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function Component() {
  const { categoryId } = useParams();
  const isNew = !categoryId || categoryId === 'new';
  const category = useGetAdminCategoryQuery(categoryId ?? '', { skip: isNew });
  const categories = useGetAdminCategoriesQuery({ page: 1, limit: 100 });

  if (categories.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (categories.isError) {
    return (
      <section className="admin-page">
        <InlineError
          message="Category structure could not be loaded safely."
          onRetry={() => void categories.refetch()}
        />
      </section>
    );
  }
  if (!isNew && category.isLoading) return <div className="admin-table-loading" aria-busy="true" />;
  if (!isNew && (category.isError || !category.data)) {
    return (
      <section className="admin-page">
        <InlineError
          message="Category could not be loaded."
          onRetry={() => void category.refetch()}
        />
      </section>
    );
  }

  return (
    <CategoryEditor
      key={category.data ? `${category.data.category.id}:${category.data.category.version}` : 'new'}
      category={category.data?.category}
      categories={categories.data?.items ?? []}
    />
  );
}

function CategoryEditor({
  category,
  categories,
}: {
  category?: AdminCategory;
  categories: AdminCategory[];
}) {
  const navigate = useNavigate();
  const [create, createState] = useCreateAdminCategoryMutation();
  const [update, updateState] = useUpdateAdminCategoryMutation();
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(category));
  const [imageMediaId, setImageMediaId] = useState(category?.imageMediaId);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const readOnly = category?.status === 'ARCHIVED';

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage('');
    setErrorMessage('');
    try {
      if (!category) {
        const response = await create({
          name: name.trim(),
          slug: slug.trim(),
          description: field(data, 'description') || null,
          parentId: field(data, 'parentId') || null,
          imageMediaId: imageMediaId ?? null,
          sortOrder: Number(field(data, 'sortOrder')) || 0,
        }).unwrap();
        await navigate(`/admin/catalog/categories/${response.category.id}`, { replace: true });
        return;
      }

      const status = field(data, 'status') as ProductStatus;
      if (
        status === 'ARCHIVED' &&
        category.status !== 'ARCHIVED' &&
        data.get('confirmArchive') !== 'on'
      ) {
        setErrorMessage('Tick the archive confirmation before archiving this category.');
        return;
      }
      await update({
        categoryId: category.id,
        expectedVersion: category.version,
        name: name.trim(),
        slug: slug.trim(),
        description: field(data, 'description') || null,
        parentId: field(data, 'parentId') || null,
        imageMediaId: imageMediaId ?? null,
        sortOrder: Number(field(data, 'sortOrder')) || 0,
        status,
      }).unwrap();
      setMessage('Category saved.');
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'Category could not be saved.'));
    }
  }

  return (
    <section className="admin-page">
      <Link className="admin-back-link" to="/admin/catalog?view=categories">
        ← Categories
      </Link>
      <header className="admin-page-header admin-page-header--detail">
        <div>
          <p className="eyebrow">{category ? category.status : 'New draft'}</p>
          <h1>{category?.name ?? 'Create category'}</h1>
          <p>Define navigation structure, hierarchy and collection artwork.</p>
        </div>
        <Link className="admin-row-link" to="/admin/catalog/media">
          Media library ↗
        </Link>
      </header>

      {message ? <p className="admin-alert admin-alert--success">{message}</p> : null}
      {errorMessage ? <p className="admin-alert">{errorMessage}</p> : null}

      <form className="admin-editor-form" onSubmit={(event) => void save(event)}>
        <div className="admin-editor-form__main">
          <label>
            <span>Category name</span>
            <input
              value={name}
              maxLength={120}
              required
              onChange={(event) => {
                setName(event.target.value);
                if (!slugWasEdited) setSlug(slugifyAdminValue(event.target.value));
              }}
            />
          </label>
          <label>
            <span>URL slug</span>
            <input
              value={slug}
              maxLength={160}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              onChange={(event) => {
                setSlugWasEdited(true);
                setSlug(event.target.value);
              }}
            />
          </label>
          <label className="admin-editor-form__wide">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={category?.description}
              maxLength={1000}
              rows={5}
            />
          </label>
          <label>
            <span>Parent category</span>
            <select name="parentId" defaultValue={category?.parentId ?? ''}>
              <option value="">Root category</option>
              {categories
                .filter((item) => item.id !== category?.id && item.status !== 'ARCHIVED')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Sort order</span>
            <input name="sortOrder" type="number" min={0} defaultValue={category?.sortOrder ?? 0} />
          </label>
          <div className="admin-editor-form__wide">
            <AdminMediaPicker
              label="Collection image"
              value={imageMediaId}
              onChange={setImageMediaId}
            />
          </div>
        </div>

        {category ? (
          <aside className="admin-editor-form__status">
            <label>
              <span>Status</span>
              <select name="status" defaultValue={category.status} disabled={readOnly}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            {category.status !== 'ARCHIVED' ? (
              <label className="admin-check-field admin-check-field--danger">
                <input name="confirmArchive" type="checkbox" />I understand archive may be blocked
                by active products or children
              </label>
            ) : null}
            <span>Version {category.version}</span>
          </aside>
        ) : null}

        <button
          className="button button--dark"
          type="submit"
          disabled={createState.isLoading || updateState.isLoading || readOnly}
        >
          {createState.isLoading || updateState.isLoading
            ? 'Saving…'
            : category
              ? 'Save category'
              : 'Create draft category'}
        </button>
      </form>
    </section>
  );
}
