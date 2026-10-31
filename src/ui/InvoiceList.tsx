import { SELLER } from '../backend/api';
import { aed, day, totals } from '../backend/money';
import { SAMPLE_TRN_FOR_DUNEPATH } from '../backend/seed';
import type { Invoice } from '../backend/types';
import { Button, Panel, StatusBadge, navigate } from './common';

export default function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const sorted = [...invoices].sort((a, b) => b.number.localeCompare(a.number));
  const draftGulf = invoices.find((i) => i.id === 'inv-0143');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em]">Invoices</h1>
          <p className="mt-1 text-[15px] text-muted">
            Sending as {SELLER.name}, TRN <span className="tnum">{SELLER.trn}</span> (sample company).
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('#/new')}>
          New invoice
        </Button>
      </div>

      <Panel className="border-route/30 bg-route-soft/50 p-5 sm:p-6">
        <h2 className="text-[19px] font-bold">Try the whole flow in about three minutes</h2>
        <ol className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
          <li className="flex gap-3">
            <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-route text-[13px] font-bold text-white">1</span>
            <span>
              Open{' '}
              <a className="font-semibold text-route underline underline-offset-2" href="#/invoice/inv-0143">
                INV-2026-0143
              </a>{' '}
              and submit it. The ASP rejects it because the customer’s network ID in the ERP is out of date. Look it up in the network
              directory, apply the fix and resubmit.
              {draftGulf && draftGulf.status !== 'draft' && <span className="text-muted"> (Reset the demo to start this step again.)</span>}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-route text-[13px] font-bold text-white">2</span>
            <span>Once it is delivered, simulate the customer’s payment and watch Volopay match it to the invoice and post it to the ERP.</span>
          </li>
          <li className="flex gap-3">
            <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-route text-[13px] font-bold text-white">3</span>
            <span>
              Create a{' '}
              <a className="font-semibold text-route underline underline-offset-2" href="#/new">
                new invoice
              </a>{' '}
              for Dunepath Logistics. Volopay’s own checks stop it before sending because the ERP has no TRN for this customer. Enter
              the sample TRN <span className="tnum font-semibold">{SAMPLE_TRN_FOR_DUNEPATH}</span> and submit again.
            </span>
          </li>
        </ol>
      </Panel>

      <Panel className="overflow-hidden">
        <table className="w-full border-collapse text-left text-[15px]">
          <caption className="sr-only">All invoices, newest first</caption>
          <thead className="hidden border-b border-line bg-paper/60 text-[13px] text-muted sm:table-header-group">
            <tr>
              <th className="px-5 py-3 font-semibold">Invoice</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Issued</th>
              <th className="px-5 py-3 font-semibold">Due</th>
              <th className="px-5 py-3 text-right font-semibold">Total (AED)</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => (
              <tr
                key={inv.id}
                className="block cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-paper/70 sm:table-row"
                onClick={() => navigate(`#/invoice/${inv.id}`)}
              >
                <td className="block px-5 pt-4 sm:table-cell sm:py-4">
                  <a href={`#/invoice/${inv.id}`} className="tnum font-semibold text-ink hover:text-route" onClick={(e) => e.stopPropagation()}>
                    {inv.number}
                  </a>
                </td>
                <td className="block px-5 sm:table-cell sm:py-4">{inv.buyer.name || <span className="text-muted">No customer yet</span>}</td>
                <td className="tnum hidden px-5 py-4 text-muted sm:table-cell">{day(inv.issueDate)}</td>
                <td className="tnum hidden px-5 py-4 text-muted sm:table-cell">{day(inv.dueDate)}</td>
                <td className="tnum block px-5 font-semibold sm:table-cell sm:py-4 sm:text-right">
                  <span className="text-muted sm:hidden">AED </span>
                  {aed(totals(inv).gross)}
                </td>
                <td className="block px-5 pt-1 pb-4 sm:table-cell sm:py-4">
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
