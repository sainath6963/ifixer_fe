import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/app/components/page-meta';
import { paiseToRupees } from '@/features/admin/admin-form-utils';
import { usePurchaseQuery, type Purchase } from '@/features/repair-inventory/inventory-api';
import {
  StockActions,
  StockForm,
  Input,
  Reason,
  QueryState,
} from '@/features/repair-inventory/inventory-ui';
import { useStockManager, money, field, amount } from '@/features/repair-inventory/inventory-utils';
export function Component() {
  const { id = '' } = useParams();
  const manager = useStockManager();
  return manager ? (
    <PurchaseDetail key={id} id={id} />
  ) : (
    <p>Purchase records are available to the owner and stock managers.</p>
  );
}
function PurchaseDetail({ id }: { id: string }) {
  const query = usePurchaseQuery(id);
  const purchase = query.data;
  return (
    <section className="admin-page stock-page">
      <PageMeta noIndex title="Purchase order" description="Receive spare parts into stock." />
      <Link className="repair-text-link" to="/admin/repair/inventory?tab=purchases">
        ← Purchase orders
      </Link>
      <QueryState query={query} />
      {purchase && !query.isError && (
        <>
          <header className="repair-job-heading">
            <div>
              <p className="repair-eyebrow">PURCHASE ORDER</p>
              <h1>{purchase.number}</h1>
              <p>{purchase.supplierName}</p>
            </div>
            <span className="repair-status">{purchase.status}</span>
          </header>
          <p>{purchase.note}</p>
          <div className="stock-card-grid">
            {purchase.lines.map((line) => (
              <article className="stock-card" key={line.partId}>
                <h2>{line.name}</h2>
                <p>{line.sku}</p>
                <p>
                  {line.received} / {line.ordered} received · Quoted {money(line.unitCostInPaise)}{' '}
                  per unit
                </p>
              </article>
            ))}
          </div>
          <StockActions scope={`purchase:${id}`}>
            {['OPEN', 'PARTIAL'].includes(purchase.status) && (
              <>
                <ReceiptForm key={purchase.version} purchase={purchase} />
                <StockForm
                  title="Cancel outstanding order"
                  button="Cancel remaining quantities"
                  submit={(data) => ({
                    path: `inventory/purchases/${id}/cancel`,
                    method: 'POST',
                    body: { expectedVersion: purchase.version, reason: field(data, 'reason') },
                  })}
                >
                  <p>
                    Already received stock stays on hand. Only unreceived quantities are cancelled.
                  </p>
                  <Reason />
                </StockForm>
              </>
            )}
          </StockActions>
          {purchase.cancellationReason && <p>Cancellation: {purchase.cancellationReason}</p>}
          <h2>Goods receipts</h2>
          {!purchase.receipts?.length && <p>No goods received yet.</p>}
          <div className="stock-card-grid">
            {purchase.receipts?.map((receipt) => (
              <article className="stock-card" key={receipt.id}>
                <h3>{receipt.reference}</h3>
                <p>{receipt.note}</p>
                <small>{new Date(receipt.createdAt).toLocaleString()}</small>
                {receipt.lines.map((line) => (
                  <p key={line.lineIndex}>
                    {purchase.lines[line.lineIndex]?.sku} · {line.quantity} units at{' '}
                    {money(line.unitCostInPaise)}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function ReceiptForm({ purchase }: { purchase: Purchase }) {
  return (
    <StockForm
      title="Receive goods"
      button="Record goods receipt"
      submit={(data) => ({
        path: `inventory/purchases/${purchase.id}/receipts`,
        method: 'POST',
        body: {
          expectedVersion: purchase.version,
          reference: field(data, 'reference'),
          note: field(data, 'note'),
          lines: purchase.lines.flatMap((_, index) => {
            const quantity = Number(field(data, `quantity-${index}`));
            return quantity > 0
              ? [{ lineIndex: index, quantity, unitCostInPaise: amount(data, `cost-${index}`) }]
              : [];
          }),
        },
      })}
    >
      <p>
        Enter quantities physically received today. Leave other lines at zero. Actual received cost
        may differ from the quoted order cost.
      </p>
      <Input label="Supplier invoice / delivery reference" name="reference" />
      {purchase.lines.map(
        (line, index) =>
          line.ordered > line.received && (
            <div className="stock-purchase-line" key={line.partId}>
              <h4>
                {line.sku} · {line.name}
              </h4>
              <Input
                label={`Received quantity · line ${index + 1}`}
                name={`quantity-${index}`}
                type="number"
                min={0}
                max={line.ordered - line.received}
                value={0}
              />
              <Input
                label={`Actual unit cost ₹ · line ${index + 1}`}
                name={`cost-${index}`}
                type="number"
                max={10000000}
                step="0.01"
                value={paiseToRupees(line.unitCostInPaise)}
              />
            </div>
          ),
      )}
      <Reason name="note" label="Receipt note" />
    </StockForm>
  );
}
