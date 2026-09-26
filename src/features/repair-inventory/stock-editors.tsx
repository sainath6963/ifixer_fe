import { useState } from 'react';
import { useRepairCatalogQuery } from '@/features/repair-bookings/repair-api';
import { paiseToRupees } from '@/features/admin/admin-form-utils';
import { useSparePartsQuery, useSuppliersQuery, type Part, type Supplier } from './inventory-api';
import { StockForm, Input, Reason, QueryState } from './inventory-ui';
import { field, amount } from './inventory-utils';
export function SupplierSelect({
  value,
  required = false,
}: {
  value?: string;
  required?: boolean;
}) {
  const [search, setSearch] = useState('');
  const query = useSuppliersQuery({ page: 1, limit: 100, search });
  return (
    <>
      <label className="repair-field">
        Find supplier
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or code"
        />
      </label>
      <QueryState query={query} />
      <label className="repair-field">
        Supplier
        <select name="supplierId" defaultValue={value ?? ''} required={required}>
          <option value="">Choose supplier</option>
          {value && !query.data?.items.some((s) => s.id === value) && (
            <option value={value}>Current supplier</option>
          )}
          {query.data?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.code}
              {!s.active && ' (inactive)'}
            </option>
          ))}
        </select>
      </label>
      {(query.data?.total ?? 0) > 100 && (
        <p>More than 100 results. Search to narrow the supplier list.</p>
      )}
    </>
  );
}
export function PartSelect({ name = 'partId' }: { name?: string }) {
  const [search, setSearch] = useState('');
  const query = useSparePartsQuery({ page: 1, limit: 100, active: 'true', search });
  return (
    <>
      <label className="repair-field">
        Find part
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SKU, name or model"
        />
      </label>
      <QueryState query={query} />
      <label className="repair-field">
        Part
        <select name={name} required>
          <option value="">Choose part</option>
          {query.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name} · {p.stock.available} available
            </option>
          ))}
        </select>
      </label>
      {(query.data?.total ?? 0) > 100 && <p>Search to narrow the first 100 matching parts.</p>}
    </>
  );
}
export function PartEditor({ part }: { part?: Part }) {
  const catalog = useRepairCatalogQuery(true);
  const [modelIds, setModelIds] = useState(part?.modelIds ?? []);
  return (
    <StockForm
      title={part ? 'Edit part details' : 'Add spare part'}
      button={part ? 'Save part details' : 'Create part'}
      submit={(data) => ({
        path: `inventory/parts${part ? '/' + part.id : ''}`,
        method: part ? 'PATCH' : 'POST',
        body: {
          expectedVersion: part?.version,
          name: field(data, 'name'),
          sku: field(data, 'sku'),
          quality: field(data, 'quality'),
          bin: field(data, 'bin') || undefined,
          supplierId: field(data, 'supplierId') || undefined,
          modelIds: data.getAll('modelIds'),
          referenceCostInPaise: amount(data, 'cost', true),
          customerPriceInPaise: amount(data, 'price'),
          reorderPoint: Number(field(data, 'reorderPoint')),
          active: field(data, 'active') === 'true',
        },
      })}
    >
      <Input label="Part name" name="name" value={part?.name} maxLength={160} />
      <label className="repair-field">
        SKU
        <input
          name="sku"
          defaultValue={part?.sku}
          readOnly={!!part}
          required
          pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,99}"
          maxLength={100}
        />
      </label>
      <Input label="Quality / grade" name="quality" value={part?.quality} />
      <QueryState query={catalog} />
      <label className="repair-field">
        Compatible models
        <select
          name="modelIds"
          multiple
          size={5}
          value={modelIds}
          onChange={(event) =>
            setModelIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
          }
        >
          {part?.modelIds
            .filter((id) => !catalog.data?.models.some((model) => model.id === id))
            .map((id) => (
              <option key={id} value={id}>
                {part.modelLabels[part.modelIds.indexOf(id)] ?? 'Saved compatible model'}
              </option>
            ))}
          {catalog.data?.models.map((m) => (
            <option key={m.id} value={m.id}>
              {catalog.data?.brands.find((b) => b.id === m.brandId)?.name} {m.name}
              {!m.active && ' (inactive)'}
            </option>
          ))}
        </select>
      </label>
      <p>
        Leave empty for parts whose compatibility is checked at the workbench. Hold Ctrl / Command
        to select multiple models.
      </p>
      <SupplierSelect value={part?.supplierId} />
      <Input label="Storage bin" name="bin" required={false} value={part?.bin} />
      <Input
        label="Reference cost ₹ (optional)"
        name="cost"
        required={false}
        value={
          part?.referenceCostInPaise === undefined ? '' : paiseToRupees(part.referenceCostInPaise)
        }
        type="number"
        step="0.01"
        max={10000000}
      />
      <p>
        Reference cost is for planning. Actual job cost comes from received stock lots; leave
        unknown opening costs blank.
      </p>
      <Input
        label="Customer price ₹"
        name="price"
        value={part ? paiseToRupees(part.customerPriceInPaise) : ''}
        type="number"
        step="0.01"
        max={10000000}
      />
      <Input
        label="Low stock threshold"
        name="reorderPoint"
        value={part?.stock.reorderPoint ?? 0}
        type="number"
        max={1000000}
      />
      <label className="repair-field">
        Part availability
        <select name="active" defaultValue={String(part?.active ?? true)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
    </StockForm>
  );
}
export function SupplierEditor({ supplier }: { supplier?: Supplier }) {
  return (
    <StockForm
      title={supplier ? `Edit ${supplier.name}` : 'Add supplier'}
      button="Save supplier"
      submit={(data) => ({
        path: `inventory/suppliers${supplier ? '/' + supplier.id : ''}`,
        method: supplier ? 'PATCH' : 'POST',
        body: {
          expectedVersion: supplier?.version,
          name: field(data, 'name'),
          code: field(data, 'code'),
          active: field(data, 'active') === 'true',
          ...Object.fromEntries(
            ['contactName', 'phone', 'email', 'address'].map((key) => [
              key,
              field(data, key) || undefined,
            ]),
          ),
        },
      })}
    >
      <Input label="Supplier name" name="name" value={supplier?.name} />
      <Input label="Supplier code" name="code" value={supplier?.code} maxLength={40} />
      <Input
        label="Contact person"
        name="contactName"
        value={supplier?.contactName}
        required={false}
      />
      <Input
        label="Phone"
        name="phone"
        value={supplier?.phone}
        required={false}
        type="tel"
        maxLength={20}
      />
      <Input
        label="Email"
        name="email"
        value={supplier?.email}
        required={false}
        type="email"
        maxLength={254}
      />
      <Input
        label="Address"
        name="address"
        value={supplier?.address}
        required={false}
        maxLength={1000}
      />
      <label className="repair-field">
        Supplier availability
        <select name="active" defaultValue={String(supplier?.active ?? true)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
    </StockForm>
  );
}
export function PurchaseEditor() {
  const [lines, setLines] = useState([0]);
  const [next, setNext] = useState(1);
  return (
    <StockForm
      title="Create purchase order"
      button="Create purchase order"
      submit={(data) => ({
        path: 'inventory/purchases',
        method: 'POST',
        body: {
          supplierId: field(data, 'supplierId'),
          note: field(data, 'note'),
          lines: lines.map((key) => ({
            partId: field(data, `part-${key}`),
            quantity: Number(field(data, `quantity-${key}`)),
            unitCostInPaise: amount(data, `cost-${key}`),
          })),
        },
      })}
    >
      <p>A purchase order does not add stock. Record a goods receipt when the parts arrive.</p>
      <SupplierSelect required />
      {lines.map((key, index) => (
        <div className="stock-purchase-line" key={key}>
          <h4>Order line {index + 1}</h4>
          <PartSelect name={`part-${key}`} />
          <Input
            label={`Ordered quantity · line ${index + 1}`}
            name={`quantity-${key}`}
            type="number"
            min={1}
            value={1}
          />
          <Input
            label={`Quoted unit cost ₹ · line ${index + 1}`}
            name={`cost-${key}`}
            type="number"
            step="0.01"
            max={10000000}
          />
          {lines.length > 1 && (
            <button type="button" onClick={() => setLines(lines.filter((n) => n !== key))}>
              Remove line {index + 1}
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={lines.length >= 30}
        onClick={() => {
          setLines([...lines, next]);
          setNext(next + 1);
        }}
      >
        Add purchase line
      </button>
      <Reason name="note" label="Purchase note" />
    </StockForm>
  );
}
