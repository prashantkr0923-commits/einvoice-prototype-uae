import { useState } from 'react';
import { applyNetworkId, findInDirectory, simulatePayment, submitInvoice, SELLER } from '../backend/api';
import { aed, day, lineNet, lineVat, time, totals, VAT_LABEL } from '../backend/money';
import { useDB } from '../backend/store';
import type { Actor, Invoice, InvoiceEvent } from '../backend/types';
import { Button, Panel, SimTag, StatusBadge, navigate } from './common';
import Route from './Route';

const ACTOR_LABEL: Record<Actor, string> = {
  user: 'You',
  volopay: 'Volopay',
  asp: 'Your ASP',
  buyer_asp: 'Buyer’s ASP',
  buyer: 'Buyer',
  fta: 'FTA',
  bank: 'Bank',
  erp: 'ERP',
};

const TONE_DOT: Record<InvoiceEvent['tone'], string> = {
  neutral: 'bg-muted/50',
  good: 'bg-route',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

function RejectionFix({ inv }: { inv: Invoice }) {
  const r = inv.rejection!;
  const [found, setFound] = useState<{ name: string; networkId: string } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const isNetwork = r.field === 'buyer.networkId';

  return (
    <Panel className="border-bad/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[19px] font-bold text-bad">Rejected by your ASP</h2>
        <SimTag>ASP response</SimTag>
      </div>
      <p className="mt-2 text-[16px] leading-relaxed">{r.message}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-muted">{r.fix}</p>
      <p className="tnum mt-2 text-[13px] text-muted">Code: {r.code}. Nothing was delivered to the buyer or reported to the FTA.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isNetwork && found === undefined && (
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setFound(await findInDirectory(inv.buyer.trn));
              setBusy(false);
            }}
          >
            {busy ? 'Looking up…' : 'Look up the customer in the network directory'}
          </Button>
        )}
        <Button onClick={() => navigate(`#/invoice/${inv.id}/edit`)}>Edit invoice</Button>
      </div>

      {found && (
        <div className="mt-4 rounded-lg border border-route/30 bg-route-soft/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold">Found in the network directory</p>
            <SimTag />
          </div>
          <dl className="tnum mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[15px]">
            <dt className="text-muted">Business</dt>
            <dd>{found.name}</dd>
            <dt className="text-muted">Network ID in directory</dt>
            <dd className="font-semibold text-route">{found.networkId}</dd>
            <dt className="text-muted">Network ID in your ERP</dt>
            <dd className="text-bad line-through decoration-1">{inv.buyer.networkId}</dd>
          </dl>
          <Button className="mt-3" variant="primary" onClick={() => applyNetworkId(inv.id, found.networkId)}>
            Use {found.networkId} and update the ERP record
          </Button>
        </div>
      )}
      {found === null && <p className="mt-3 text-[15px] text-bad">This TRN is not in the network directory. Confirm it with the customer.</p>}
    </Panel>
  );
}

export default function InvoiceDetail({ id }: { id: string }) {
  const db = useDB();
  const inv = db.invoices.find((i) => i.id === id);
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [seen] = useState(() => new Set(inv?.events.map((e) => e.id)));

  if (!inv) {
    return (
      <Panel className="p-8">
        <p className="text-[17px]">This invoice no longer exists. It may have been removed when the demo was reset.</p>
        <Button className="mt-4" onClick={() => navigate('#/')}>Back to invoices</Button>
      </Panel>
    );
  }

  const t = totals(inv);
  const corrected = inv.status === 'draft' && inv.attempts > 0;

  const submit = async () => {
    setSending(true);
    await submitInvoice(inv.id);
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <a href="#/" className="text-[15px] font-semibold text-route hover:underline">Back to invoices</a>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tnum text-[32px] font-bold leading-tight tracking-[-0.01em]">{inv.number}</h1>
            <StatusBadge status={inv.status} />
          </div>
          <p className="mt-1 text-[16px] text-muted">
            To {inv.buyer.name || 'no customer yet'}. Issued {day(inv.issueDate)}, due {day(inv.dueDate)}.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] text-muted">Total including VAT</p>
          <p className="tnum text-[30px] font-bold leading-tight">AED {aed(t.gross)}</p>
        </div>
      </div>

      <Panel className="p-5 sm:p-6">
        <Route p={inv.progress} />

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
          {(inv.status === 'draft' || inv.status === 'needs_fixes') && (
            <>
              <Button variant="primary" onClick={submit} disabled={sending}>
                {sending ? 'Submitting…' : corrected ? 'Resubmit to the network' : 'Check and submit'}
              </Button>
              <Button onClick={() => navigate(`#/invoice/${inv.id}/edit`)}>Edit invoice</Button>
              <p className="text-[14px] text-muted">Volopay checks the invoice first, then hands it to your ASP.</p>
            </>
          )}
          {inv.status === 'sent' && <p className="text-[15px] font-semibold text-route">On its way through the network…</p>}
          {inv.status === 'delivered' && (
            <>
              <Button
                variant="primary"
                disabled={paying}
                onClick={async () => {
                  setPaying(true);
                  await simulatePayment(inv.id);
                  setPaying(false);
                }}
              >
                {paying ? 'Receiving payment…' : 'Simulate the customer’s payment'}
              </Button>
              <p className="text-[14px] text-muted">
                The customer pays AED {aed(t.gross)} into this invoice’s own virtual account, so Volopay can match it without anyone reading a bank statement.
              </p>
            </>
          )}
          {inv.status === 'paid' && <p className="text-[15px] font-semibold text-good">Paid, matched and posted to the ERP. Nothing left to do.</p>}
          {inv.status === 'rejected' && <p className="text-[15px] text-muted">Fix the problem below, then resubmit.</p>}
        </div>
      </Panel>

      {inv.status === 'rejected' && inv.rejection && <RejectionFix key={inv.events.length} inv={inv} />}

      {inv.status === 'needs_fixes' && inv.issues.length > 0 && (
        <Panel className="border-warn/40 bg-warn-soft p-5 sm:p-6">
          <h2 className="text-[19px] font-bold text-warn">Stopped by Volopay before sending</h2>
          <ul className="mt-2 space-y-1.5 text-[15px] leading-snug">
            {inv.issues.map((i) => (
              <li key={i.field + i.message}>
                <span className="font-semibold">{i.message}</span> <span className="text-muted">{i.fix}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" variant="primary" onClick={() => navigate(`#/invoice/${inv.id}/edit`)}>Fix in the invoice</Button>
        </Panel>
      )}

      {corrected && (
        <Panel className="border-route/30 bg-route-soft/50 p-4 text-[15px]">
          Corrected and saved. The customer’s ERP record now holds the right details. Resubmit when ready.
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="grid gap-4 border-b border-line-soft p-5 text-[14px] leading-relaxed sm:grid-cols-2 sm:p-6">
              <div>
                <p className="font-semibold text-muted">From</p>
                <p className="text-[15px] font-semibold">{SELLER.name}</p>
                <p className="tnum">TRN {SELLER.trn}</p>
                <p className="tnum">Network ID {SELLER.networkId}</p>
              </div>
              <div>
                <p className="font-semibold text-muted">To</p>
                <p className="text-[15px] font-semibold">{inv.buyer.name || '—'}</p>
                <p className="tnum">TRN {inv.buyer.trn || <span className="text-bad">missing</span>}</p>
                <p className="tnum">Network ID {inv.buyer.networkId || <span className="text-bad">missing</span>}</p>
                <p>{[inv.buyer.address, inv.buyer.emirate].filter(Boolean).join(', ')}</p>
              </div>
            </div>
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Invoice lines</caption>
              <thead className="text-[13px] text-muted">
                <tr className="border-b border-line-soft">
                  <th className="px-5 py-2.5 font-semibold sm:px-6">Item</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Qty</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Unit (AED)</th>
                  <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">VAT</th>
                  <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Net (AED)</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {inv.lines.map((l) => (
                  <tr key={l.id} className="border-b border-line-soft">
                    <td className="px-5 py-3 sm:px-6">
                      {l.description || <span className="text-muted">No description</span>}
                      <span className="block text-[13px] text-muted sm:hidden">
                        {l.quantity} × {aed(l.unitPrice)}, {VAT_LABEL[l.vat]}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-right sm:table-cell">{l.quantity}</td>
                    <td className="hidden px-3 py-3 text-right sm:table-cell">{aed(l.unitPrice)}</td>
                    <td className="hidden px-3 py-3 text-muted sm:table-cell">
                      {VAT_LABEL[l.vat]}
                      {lineVat(l) > 0 && <span className="block text-[13px]">AED {aed(lineVat(l))}</span>}
                    </td>
                    <td className="px-5 py-3 text-right sm:px-6">{aed(lineNet(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="tnum ml-auto max-w-xs space-y-1 px-5 py-4 text-[15px] sm:px-6">
              <div className="flex justify-between"><dt className="text-muted">Net</dt><dd>{aed(t.net)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">VAT</dt><dd>{aed(t.vat)}</dd></div>
              <div className="flex justify-between text-[17px] font-bold"><dt>Total AED</dt><dd>{aed(t.gross)}</dd></div>
            </dl>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-bold">How the customer pays</h2>
              <SimTag>Bank partner</SimTag>
            </div>
            <dl className="tnum mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
              <dt className="text-muted">Virtual account</dt>
              <dd className="font-semibold">{inv.virtualAccount}</dd>
              <dt className="text-muted">Reference</dt>
              <dd>{inv.number}</dd>
            </dl>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Every invoice gets its own account number, so an incoming payment identifies itself. In production the account would come from a licensed
              partner such as Airwallex. This sample number is deliberately invalid.
            </p>
          </Panel>

          <details className="group rounded-xl border border-line bg-surface p-5 sm:p-6">
            <summary className="cursor-pointer text-[17px] font-bold">Invoice data sent to the ASP (simplified preview)</summary>
            <p className="mt-2 text-[14px] text-muted">
              A short extract of the structured invoice, to show what travels instead of a PDF. A real PINT AE file has 51 mandatory fields and is
              generated and checked by the ASP integration.
            </p>
            <pre className="tnum mt-3 overflow-x-auto rounded-lg bg-paper p-4 text-[13px] leading-relaxed">{`<Invoice>
  <ID>${inv.number}</ID>
  <IssueDate>${inv.issueDate}</IssueDate>
  <DocumentCurrencyCode>AED</DocumentCurrencyCode>
  <Seller name="${SELLER.name}" TRN="${SELLER.trn}" endpoint="${SELLER.networkId}"/>
  <Buyer name="${inv.buyer.name}" TRN="${inv.buyer.trn}" endpoint="${inv.buyer.networkId}"/>
  <TaxTotal currency="AED">${t.vat.toFixed(2)}</TaxTotal>
  <PayableAmount currency="AED">${t.gross.toFixed(2)}</PayableAmount>
  <!-- ${inv.lines.length} invoice line(s) omitted -->
</Invoice>`}</pre>
          </details>
        </div>

        <Panel className="p-5 sm:p-6">
          <h2 className="text-[17px] font-bold">What happened</h2>
          <p className="mt-1 text-[14px] text-muted">Newest first. Dashed tags mark simulated partner events; the rest is Volopay’s own logic.</p>
          <ol className="mt-4 space-y-4">
            {[...inv.events].reverse().map((e) => (
              <li key={e.id} className={`flex gap-3 ${seen.has(e.id) ? '' : 'event-new'}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[e.tone]}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className={`text-[15px] font-semibold leading-snug ${e.tone === 'bad' ? 'text-bad' : ''}`}>{e.title}</p>
                  {e.detail && <p className="mt-0.5 text-[14px] leading-snug text-muted">{e.detail}</p>}
                  <p className="tnum mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    <span>{ACTOR_LABEL[e.actor]}</span>
                    <span>{day(e.at)}, {time(e.at)}</span>
                    {e.code && <span className="font-semibold">{e.code}</span>}
                    {e.simulated && <SimTag />}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
