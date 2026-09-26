import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import {
  useSparePartsQuery,
  useSuppliersQuery,
  usePurchasesQuery,
  useMovementsQuery,
  type Part,
} from '@/features/repair-inventory/inventory-api';
import { StockActions, Pager, QueryState } from '@/features/repair-inventory/inventory-ui';
import { useStockManager, money } from '@/features/repair-inventory/inventory-utils';
import {
  PartEditor,
  SupplierEditor,
  PurchaseEditor,
} from '@/features/repair-inventory/stock-editors';
export function Component() {
  const manager = useStockManager();
  const [params, setParams] = useSearchParams();
  const tab =
    manager && ['suppliers', 'purchases', 'movements'].includes(params.get('tab') ?? '')
      ? params.get('tab')!
      : 'parts';
  return (
    <section className="admin-page stock-page">
      <PageMeta
        noIndex
        title="Parts & inventory"
        description="Repair stock, suppliers and goods receipts."
      />
      <header className="repair-job-heading">
        <div>
          <p className="repair-eyebrow">WORKSHOP STOCK</p>
          <h1>Parts & inventory</h1>
          <p>Know what is on the shelf, held for a repair and ready to use.</p>
        </div>
      </header>
      <nav className="repair-job-tabs" aria-label="Inventory sections">
        {['parts', ...(manager ? ['suppliers', 'purchases', 'movements'] : [])].map((name) => (
          <button
            key={name}
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setParams({ tab: name })}
          >
            {name === 'parts' ? 'Spare parts' : name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </nav>
      <StockActions scope="inventory">
        {tab === 'parts' && <Parts manager={manager} />}
        {tab === 'suppliers' && <Suppliers />}
        {tab === 'purchases' && <Purchases />}
        {tab === 'movements' && <Movements partId={params.get('partId') ?? undefined} />}
      </StockActions>
    </section>
  );
}
export function StockCounts({ part }: { part: Part }) {
  return (
    <dl className="stock-counts">
      {[
        ['On hand', part.stock.onHand],
        ['Reserved', part.stock.reserved],
        ['Available', part.stock.available],
        ['Low stock at', part.stock.reorderPoint],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Parts({ manager }: { manager: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [low, setLow] = useState(false);
  const [show, setShow] = useState(false);
  const query = useSparePartsQuery({ page, search, lowStock: low ? 'true' : undefined });
  return (
    <>
      <div className="stock-toolbar">
        <label className="repair-field">
          Search parts
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="SKU, name, model or grade"
          />
        </label>
        <label className="repair-job-checkbox">
          <input
            type="checkbox"
            checked={low}
            onChange={(e) => {
              setLow(e.target.checked);
              setPage(1);
            }}
          />{' '}
          Low stock only
        </label>
        {manager && (
          <button className="repair-button" onClick={() => setShow(!show)}>
            {show ? 'Close new part form' : 'Add spare part'}
          </button>
        )}
      </div>
      {show && <PartEditor />}
      <QueryState query={query} />
      <div className="stock-card-grid">
        {!query.isError &&
          query.data?.items.map((part) => (
            <article className="stock-card" key={part.id}>
              <header>
                <span className="repair-eyebrow">{part.sku}</span>
                <span className="repair-status">
                  {!part.active ? 'Inactive' : part.stock.lowStock ? 'Low stock' : 'In stock'}
                </span>
              </header>
              <h2>
                <Link to={`/admin/repair/inventory/parts/${part.id}`}>{part.name}</Link>
              </h2>
              <p>
                {part.quality} · {part.bin || 'Bin not set'}
              </p>
              <p>{part.modelLabels.join(', ') || 'Check compatibility before use'}</p>
              <StockCounts part={part} />
              <p>Customer price {money(part.customerPriceInPaise)}</p>
            </article>
          ))}
      </div>
      {query.data && !query.isError && (
        <>
          <p>{query.data.total} matching parts</p>
          <Pager page={page} pages={query.data.totalPages} setPage={setPage} />
        </>
      )}
    </>
  );
}
function Suppliers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useSuppliersQuery({ page, search });
  return (
    <>
      <details className="stock-disclosure">
        <summary>Add supplier</summary>
        <SupplierEditor />
      </details>
      <label className="repair-field">
        Search suppliers
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} />
      <div className="stock-card-grid">
        {!query.isError &&
          query.data?.items.map((supplier) => (
            <article className="stock-card" key={supplier.id}>
              <h2>{supplier.name}</h2>
              <p>
                {supplier.code} · {supplier.active ? 'Active' : 'Inactive'}
              </p>
              <p>
                {supplier.contactName} {supplier.phone} {supplier.email}
              </p>
              <p>{supplier.address}</p>
              <details>
                <summary>Edit supplier</summary>
                <SupplierEditor key={supplier.version} supplier={supplier} />
              </details>
            </article>
          ))}
      </div>
      {query.data && !query.isError && (
        <>
          <p>{query.data.total} suppliers</p>
          <Pager page={page} pages={query.data.totalPages} setPage={setPage} />
        </>
      )}
    </>
  );
}
function Purchases() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = usePurchasesQuery({ page, search });
  return (
    <>
      <details className="stock-disclosure">
        <summary>New purchase order</summary>
        <PurchaseEditor />
      </details>
      <label className="repair-field">
        Search purchases
        <input
          value={search}
          placeholder="PO number, supplier or SKU"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} />
      <div className="stock-card-grid">
        {!query.isError &&
          query.data?.items.map((purchase) => (
            <article className="stock-card" key={purchase.id}>
              <span className="repair-status">{purchase.status}</span>
              <h2>
                <Link to={`/admin/repair/inventory/purchases/${purchase.id}`}>
                  {purchase.number}
                </Link>
              </h2>
              <p>{purchase.supplierName}</p>
              <p>
                {purchase.lines.reduce((n, l) => n + l.received, 0)} of{' '}
                {purchase.lines.reduce((n, l) => n + l.ordered, 0)} units received
              </p>
              <p>
                Order value{' '}
                {money(purchase.lines.reduce((n, l) => n + l.ordered * l.unitCostInPaise, 0))}
              </p>
            </article>
          ))}
      </div>
      {query.data && !query.isError && (
        <>
          <p>{query.data.total} purchase orders</p>
          <Pager page={page} pages={query.data.totalPages} setPage={setPage} />
        </>
      )}
    </>
  );
}
function Movements({ partId }: { partId?: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [job, setJob] = useState('');
  const valid = !job || /^JOB-[A-F0-9]{16}$/.test(job);
  const query = useMovementsQuery(
    { page, search, jobNumber: job || undefined, partId },
    { skip: !valid },
  );
  return (
    <>
      <h2>Stock movement history</h2>
      <div className="stock-toolbar">
        <label className="repair-field">
          Search SKU or model
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="repair-field">
          Job number
          <input
            value={job}
            placeholder="JOB-…"
            onChange={(e) => {
              setJob(e.target.value.trim().toUpperCase());
              setPage(1);
            }}
          />
        </label>
      </div>
      {!valid && <p>Enter the complete job number to search.</p>}
      {partId && (
        <p>
          Showing this part only.{' '}
          <Link to="/admin/repair/inventory?tab=movements">Show all parts</Link>
        </p>
      )}
      <QueryState query={query} />
      <div className="stock-card-grid">
        {valid &&
          !query.isError &&
          query.data?.items.map((m) => (
            <article className="stock-card" key={m.id}>
              <h3>
                {m.action.replace('REPAIR_', '').replaceAll('_', ' ')} · {m.sku}
              </h3>
              <p>{m.note}</p>
              <p>
                On hand {signed(m.deltaOnHand)} · Reserved {signed(m.deltaReserved)} · Used{' '}
                {signed(m.deltaConsumed)}
              </p>
              {m.knownCostInPaise !== undefined && (
                <p>
                  Known cost {money(m.knownCostInPaise)}
                  {m.unknownCostQuantity > 0 &&
                    ` + ${m.unknownCostQuantity} units with unknown cost`}
                </p>
              )}
              <small>{new Date(m.createdAt).toLocaleString()}</small>
            </article>
          ))}
      </div>
      {valid && query.data && !query.isError && (
        <>
          <p>{query.data.total} movements</p>
          <Pager page={page} pages={query.data.totalPages} setPage={setPage} />
        </>
      )}
    </>
  );
}
function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
