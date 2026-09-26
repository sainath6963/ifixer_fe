import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import {
  useSparePartQuery,
  useStockLotsQuery,
  type Part,
} from '@/features/repair-inventory/inventory-api';
import {
  StockActions,
  StockForm,
  Input,
  Reason,
  Pager,
  QueryState,
} from '@/features/repair-inventory/inventory-ui';
import { useStockManager, money, field, amount } from '@/features/repair-inventory/inventory-utils';
import { PartEditor } from '@/features/repair-inventory/stock-editors';
import { StockCounts } from './admin-repair-inventory-page';
export function Component() {
  const { id = '' } = useParams();
  return <PartDetail key={id} id={id} />;
}
function PartDetail({ id }: { id: string }) {
  const query = useSparePartQuery(id);
  const manager = useStockManager();
  const part = query.data;
  return (
    <section className="admin-page stock-page">
      <PageMeta
        noIndex
        title="Spare part"
        description="Part availability, stock receipts and adjustments."
      />
      <Link className="repair-text-link" to="/admin/repair/inventory">
        ← Parts & inventory
      </Link>
      <QueryState query={query} />
      {part && !query.isError && (
        <>
          <header className="repair-job-heading">
            <div>
              <p className="repair-eyebrow">{part.sku}</p>
              <h1>{part.name}</h1>
              <p>
                {part.quality} · {part.active ? 'Active' : 'Inactive'} · {part.bin || 'Bin not set'}
              </p>
            </div>
            <span className="repair-status">
              {part.stock.lowStock ? 'Low stock' : `${part.stock.available} available`}
            </span>
          </header>
          <StockCounts part={part} />
          <p>Models: {part.modelLabels.join(', ') || 'Compatibility check required'}</p>
          <p>Customer price {money(part.customerPriceInPaise)}</p>
          {manager && (
            <StockActions scope={`part:${id}`}>
              <p>
                Reference cost {money(part.referenceCostInPaise)} · Net units issued to repairs{' '}
                {part.stock.repairConsumed}
              </p>
              <Link
                className="repair-text-link"
                to={`/admin/repair/inventory?tab=movements&partId=${id}`}
              >
                View movement history
              </Link>
              <details className="stock-disclosure">
                <summary>Edit part details</summary>
                <PartEditor key={part.version} part={part} />
              </details>
              <Adjustments key={part.stock.version} part={part} />
            </StockActions>
          )}
        </>
      )}
    </section>
  );
}
function Adjustments({ part }: { part: Part }) {
  const [page, setPage] = useState(1);
  const lots = useStockLotsQuery({ id: part.id, page });
  const [action, setAction] = useState(
    part.openingRecorded || part.stock.onHand > 0 ? 'ADJUST_IN' : 'OPENING',
  );
  const incoming = ['OPENING', 'ADJUST_IN'].includes(action);
  return (
    <>
      <StockForm
        title="Record stock change"
        button="Record stock change"
        submit={(data) => ({
          path: `inventory/parts/${part.id}/adjustments`,
          method: 'POST',
          body: {
            expectedVersion: part.stock.version,
            action,
            quantity: Number(field(data, 'quantity')),
            reason: field(data, 'reason'),
            ...(incoming ? { unitCostInPaise: amount(data, 'cost', true) } : {}),
            ...(action === 'SUPPLIER_RETURN' ? { lotId: field(data, 'lotId') } : {}),
          },
        })}
      >
        <label className="repair-field">
          Stock action
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            {!part.openingRecorded && part.stock.onHand === 0 && (
              <option value="OPENING">Opening stock (once)</option>
            )}
            <option value="ADJUST_IN">Count correction: add stock</option>
            <option value="ADJUST_OUT">Count correction: remove stock</option>
            <option value="DAMAGE">Damage / write-off</option>
            <option value="SUPPLIER_RETURN">Return stock to supplier</option>
          </select>
        </label>
        <Input label="Quantity" name="quantity" type="number" min={1} value={1} />
        {incoming && (
          <>
            <Input
              label="Actual unit cost ₹ (optional)"
              name="cost"
              type="number"
              step="0.01"
              required={false}
              max={10000000}
            />
            <p>Blank cost stays unknown. Use goods receipts for purchased stock.</p>
          </>
        )}
        {action === 'SUPPLIER_RETURN' && (
          <label className="repair-field">
            Supplier receipt lot
            <select name="lotId" required key={page}>
              <option value="">Choose a lot from this page</option>
              {!lots.isError &&
                lots.data?.items
                  .filter((lot) => lot.supplierId)
                  .map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {new Date(lot.createdAt).toLocaleDateString()} · {lot.remaining} left ·{' '}
                      {money(lot.unitCostInPaise)} · {lot.id.slice(-6)}
                    </option>
                  ))}
            </select>
          </label>
        )}
        <Reason />
        <p>
          Reserved units cannot be removed. Release the job reservation first. Supplier returns
          record stock movement; supplier credit settlement is separate.
        </p>
      </StockForm>
      <h2>Available stock lots</h2>
      <p>
        Oldest received stock is issued first. Usable repair returns retain their original cost.
      </p>
      <QueryState query={lots} />
      <div className="stock-card-grid">
        {!lots.isError &&
          lots.data?.items.map((lot) => (
            <article className="stock-card" key={lot.id}>
              <h3>
                {lot.source} · {lot.id.slice(-6)}
              </h3>
              <p>
                {lot.remaining} of {lot.quantity} left · {money(lot.unitCostInPaise)} each
              </p>
              <small>{new Date(lot.createdAt).toLocaleString()}</small>
              {lot.purchaseId && (
                <p>
                  <Link to={`/admin/repair/inventory/purchases/${lot.purchaseId}`}>
                    View purchase and receipts
                  </Link>
                </p>
              )}
            </article>
          ))}
      </div>
      {lots.data && !lots.isError && (
        <Pager page={page} pages={lots.data.totalPages} setPage={setPage} />
      )}
    </>
  );
}
