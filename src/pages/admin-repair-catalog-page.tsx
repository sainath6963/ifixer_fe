import { useState } from 'react';
import { PageMeta } from '@/app/components/page-meta';
import { paiseToRupees, rupeesToPaise, slugifyAdminValue } from '@/features/admin/admin-form-utils';
import {
  useRepairCatalogQuery,
  useSaveRepairCatalogMutation,
} from '@/features/repair-bookings/repair-api';
import { repairError, repairPrice } from '@/features/repair-bookings/repair-utils';
import type {
  CatalogEntry,
  CatalogKind,
  PricingMode,
  RepairCatalog,
} from '@/features/repair-bookings/repair.types';

const titles: Record<CatalogKind, string> = {
  brands: 'Brands',
  models: 'Models',
  services: 'Services',
  options: 'Model compatibility',
};
export function Component() {
  const query = useRepairCatalogQuery(true);
  const [kind, setKind] = useState<CatalogKind>('brands');
  const [editing, setEditing] = useState<string>();
  const [editorRevision, setEditorRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const data = query.data;
  const entry = data?.[kind].find((row) => row.id === editing);
  const label = (row: CatalogEntry) =>
    kind === 'options'
      ? `${data?.models.find((model) => model.id === row.modelId)?.name ?? 'Model'} · ${data?.services.find((service) => service.id === row.serviceId)?.name ?? 'Service'}`
      : `${row.name}${row.brandId ? ' · ' + (data?.brands.find((brand) => brand.id === row.brandId)?.name ?? '') : ''}`;
  return (
    <section className="admin-page repair-catalog-admin">
      <PageMeta
        noIndex
        title="Repair catalog"
        description="Manage repair brands, device models, service descriptions and indicative pricing."
      />
      <header className="admin-page-header">
        <div>
          <p className="repair-eyebrow">REPAIR CATALOG</p>
          <h1>
            The right repair.
            <br />
            For each phone.
          </h1>
          <p>
            Add brands and models, then services and their compatible model options. Switch off
            entries to archive them without deleting booking history.
          </p>
        </div>
      </header>
      <nav className="repair-admin-tabs" aria-label="Catalog sections">
        {(Object.keys(titles) as CatalogKind[]).map((value) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setEditing(undefined);
              setSearch('');
              setNotice('');
            }}
          >
            {titles[value]}
          </button>
        ))}
      </nav>
      {notice && <p role="status">{notice}</p>}
      {query.isLoading && <p role="status">Loading repair catalog…</p>}
      {query.isError && (
        <p role="alert">
          {repairError(query.error)} <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {data && !query.isError && (
        <div className="repair-catalog-workspace">
          <section>
            <div className="repair-catalog-list-heading">
              <h2>{titles[kind]}</h2>
              <button
                className="repair-secondary-button"
                onClick={() => {
                  setEditing(undefined);
                  setEditorRevision((value) => value + 1);
                  setNotice('');
                }}
              >
                New entry
              </button>
            </div>
            <label className="repair-field">
              Filter entries
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <ul className="repair-catalog-list">
              {data[kind]
                .filter((row) => label(row).toLowerCase().includes(search.toLowerCase()))
                .map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{label(row)}</strong>
                      <span>
                        {row.active ? 'Active' : 'Archived / inactive'}
                        {row.pricingMode ? ` · ${repairPrice(row.priceInPaise)}` : ''}
                      </span>
                    </div>
                    <button
                      className="repair-text-link"
                      onClick={() => {
                        setEditing(row.id);
                        setNotice('');
                      }}
                    >
                      Edit<span className="sr-only"> {label(row)}</span>
                    </button>
                  </li>
                ))}
            </ul>
            {!data[kind].length && <p>No entries yet. Add your first one using the form.</p>}
          </section>
          <CatalogForm
            key={`${kind}:${entry?.id ?? 'new'}:${entry?.version ?? 0}:${editorRevision}`}
            kind={kind}
            entry={entry}
            data={data}
            onFailure={(message) => setNotice(`Could not save: ${message}`)}
            onSaved={() => {
              setEditing(undefined);
              setEditorRevision((value) => value + 1);
              setNotice('Catalog saved.');
            }}
          />
        </div>
      )}
    </section>
  );
}

function CatalogForm({
  kind,
  entry,
  data,
  onSaved,
  onFailure,
}: {
  kind: CatalogKind;
  entry?: CatalogEntry;
  data: RepairCatalog;
  onSaved: () => void;
  onFailure: (message: string) => void;
}) {
  const [save, mutation] = useSaveRepairCatalogMutation();
  const [name, setName] = useState(entry?.name ?? '');
  const [slug, setSlug] = useState(entry?.slug ?? '');
  const [active, setActive] = useState(entry?.active ?? false);
  const [sortOrder, setSort] = useState(entry?.sortOrder ?? 0);
  const [brandId, setBrand] = useState(entry?.brandId ?? '');
  const [modelId, setModel] = useState(entry?.modelId ?? '');
  const [serviceId, setService] = useState(entry?.serviceId ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [mode, setMode] = useState<PricingMode>(entry?.pricingMode ?? 'DIAGNOSIS');
  const [price, setPrice] = useState(paiseToRupees(entry?.priceInPaise));
  const [error, setError] = useState('');
  const priced = kind === 'services' || kind === 'options';
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const amount = mode === 'INDICATIVE' ? rupeesToPaise(price) : undefined;
    if (priced && mode === 'INDICATIVE' && (amount === undefined || amount > 1000000000)) {
      setError('Enter a valid rupee amount with at most two decimal places.');
      return;
    }
    const body = {
      active,
      sortOrder,
      ...(entry ? { expectedVersion: entry.version } : {}),
      ...(kind !== 'options'
        ? { name: name.trim(), slug: slug || slugifyAdminValue(name) }
        : { modelId, serviceId }),
      ...(kind === 'models' ? { brandId } : {}),
      ...(kind === 'services' ? { description: description.trim() } : {}),
      ...(priced
        ? { pricingMode: mode, ...(amount !== undefined ? { priceInPaise: amount } : {}) }
        : {}),
    };
    try {
      await save({ kind, id: entry?.id, body }).unwrap();
      onSaved();
    } catch (failure) {
      setError(repairError(failure));
      onFailure(repairError(failure));
    }
  }
  return (
    <form
      className="repair-booking-form repair-catalog-form"
      onSubmit={(event) => void submit(event)}
    >
      <h2>{entry ? 'Edit entry' : 'New entry'}</h2>
      <fieldset disabled={mutation.isLoading}>
        <legend>{titles[kind]}</legend>
        {kind !== 'options' && (
          <>
            <label className="repair-field">
              Name
              <input
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="repair-field">
              URL slug
              <input
                maxLength={160}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                placeholder={slugifyAdminValue(name) || 'generated-from-name'}
                onChange={(event) => setSlug(event.target.value)}
              />
            </label>
          </>
        )}
        {kind === 'models' && (
          <label className="repair-field">
            Brand
            <select required value={brandId} onChange={(event) => setBrand(event.target.value)}>
              <option value="">Select brand</option>
              {data.brands.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'options' && (
          <>
            <label className="repair-field">
              Device model
              <select required value={modelId} onChange={(event) => setModel(event.target.value)}>
                <option value="">Select model</option>
                {data.models.map((row) => (
                  <option key={row.id} value={row.id}>
                    {data.brands.find((brand) => brand.id === row.brandId)?.name} {row.name}
                    {row.active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="repair-field">
              Repair service
              <select
                required
                value={serviceId}
                onChange={(event) => setService(event.target.value)}
              >
                <option value="">Select service</option>
                {data.services.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                    {row.active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === 'services' && (
          <label className="repair-field">
            Description
            <textarea
              required
              maxLength={1200}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        )}
        {priced && (
          <>
            <label className="repair-field">
              Pricing
              <select value={mode} onChange={(event) => setMode(event.target.value as PricingMode)}>
                <option value="DIAGNOSIS">Diagnosis required</option>
                <option value="INDICATIVE">Indicative estimate</option>
              </select>
            </label>
            {mode === 'INDICATIVE' && (
              <label className="repair-field">
                Indicative amount (₹)
                <input
                  inputMode="decimal"
                  required
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </label>
            )}
            <p className="repair-price-note">
              Estimates are not confirmed charges. Model-specific compatibility controls what
              customers can select.
            </p>
          </>
        )}
        <label className="repair-field">
          Display order
          <input
            type="number"
            min={0}
            max={100000}
            step={1}
            required
            value={sortOrder}
            onChange={(event) => setSort(Number(event.target.value))}
          />
        </label>
        <label className="repair-checkbox">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active and available for selection
        </label>
        <button className="repair-button">{mutation.isLoading ? 'Saving…' : 'Save entry'}</button>
      </fieldset>
      {error && (
        <p className="repair-form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
