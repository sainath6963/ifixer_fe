import { Link } from 'react-router-dom';
import type { RepairJob } from '@/features/repair-jobs/job.types';
import { useJobPartsQuery } from './inventory-api';
import { StockActions, StockForm, Input, Reason, QueryState } from './inventory-ui';
import { useStockManager, money, field } from './inventory-utils';
import { PartSelect } from './stock-editors';
export function JobPartsPanel({ job }: { job: RepairJob }) {
  const query = useJobPartsQuery(job.number);
  const manager = useStockManager();
  const canReserve =
    ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'REPAIRING'].includes(job.status) &&
    job.estimates.at(-1)?.approval?.decision === 'APPROVED';
  return (
    <section className="repair-job-panel stock-page">
      <h2>Parts for this repair</h2>
      <p>
        Reserve before fitting a part. Record usage when fitted. Customer charges remain on the
        approved estimate.
      </p>
      <QueryState query={query} />
      <StockActions scope={`job:${job.number}`}>
        {!query.isError && query.data && (
          <>
            {canReserve ? (
              <StockForm
                title="Reserve a part"
                button="Reserve part"
                submit={(data) => ({
                  path: `jobs/${job.number}/parts`,
                  method: 'POST',
                  body: {
                    expectedJobVersion: job.version,
                    partId: field(data, 'partId'),
                    quantity: Number(field(data, 'quantity')),
                    compatibilityNote: field(data, 'compatibilityNote'),
                    reason: field(data, 'reason'),
                  },
                })}
              >
                <PartSelect />
                <Input label="Quantity" name="quantity" value={1} type="number" min={1} max={100} />
                <Input label="Compatibility checked" name="compatibilityNote" maxLength={500} />
                <Reason />
              </StockForm>
            ) : (
              <p>
                Parts can be reserved after approval of the latest estimate, while awaiting parts or
                repairing.
              </p>
            )}
            {!query.data.items.length && <p>No parts reserved or used for this job.</p>}
            <div className="stock-card-grid">
              {query.data.items.map((usage) => (
                <article className="stock-card" key={usage.id}>
                  <header>
                    <span className="repair-status">{usage.status}</span>
                    <span>Estimate {usage.estimateRevision}</span>
                  </header>
                  <h3>
                    <Link to={`/admin/repair/inventory/parts/${usage.partId}`}>{usage.name}</Link>
                  </h3>
                  <p>
                    {usage.sku} · {usage.quantity} units
                  </p>
                  <p>{usage.compatibilityNote}</p>
                  <p>{usage.note}</p>
                  {usage.status === 'CONSUMED' && (
                    <>
                      <p>
                        Returned usable: {usage.returnedUsable} · Returned damaged:{' '}
                        {usage.returnedDamaged}
                      </p>
                      {manager && (
                        <p>
                          Actual parts cost {money(usage.costInPaise)}
                          {(usage.unknownCostQuantity ?? 0) > 0 &&
                            ` + ${usage.unknownCostQuantity} units with unknown cost`}
                        </p>
                      )}
                    </>
                  )}
                  {usage.status === 'RESERVED' && (
                    <StockForm
                      title={`Use or release ${usage.sku}`}
                      button="Update reserved part"
                      submit={(data) => ({
                        path: `jobs/${job.number}/parts/${usage.id}`,
                        method: 'POST',
                        body: {
                          expectedJobVersion: job.version,
                          action: field(data, 'action'),
                          reason: field(data, 'reason'),
                        },
                      })}
                    >
                      <label className="repair-field">
                        Part action
                        <select name="action">
                          {job.permissions.repair && job.status === 'REPAIRING' && (
                            <option value="CONSUME">Mark all reserved units as used</option>
                          )}
                          <option value="RELEASE">Release all unused units</option>
                        </select>
                      </label>
                      <Reason />
                    </StockForm>
                  )}
                  {manager &&
                    usage.status === 'CONSUMED' &&
                    usage.quantity > usage.returnedUsable + usage.returnedDamaged && (
                      <StockForm
                        title={`Return ${usage.sku}`}
                        button="Record part return"
                        submit={(data) => ({
                          path: `jobs/${job.number}/parts/${usage.id}`,
                          method: 'POST',
                          body: {
                            expectedJobVersion: job.version,
                            action: field(data, 'action'),
                            quantity: Number(field(data, 'quantity')),
                            reason: field(data, 'reason'),
                          },
                        })}
                      >
                        <label className="repair-field">
                          Return condition
                          <select name="action">
                            <option value="RETURN_USABLE">
                              Inspected and reusable: restore stock
                            </option>
                            <option value="RETURN_DAMAGED">
                              Damaged: keep out of available stock
                            </option>
                          </select>
                        </label>
                        <Input
                          label="Return quantity"
                          name="quantity"
                          value={1}
                          type="number"
                          min={1}
                          max={usage.quantity - usage.returnedUsable - usage.returnedDamaged}
                        />
                        <Reason />
                      </StockForm>
                    )}
                </article>
              ))}
            </div>
          </>
        )}
      </StockActions>
    </section>
  );
}
