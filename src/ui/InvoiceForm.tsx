import { useMemo, useRef, useState } from 'react';
import { blankInvoice, findInDirectory, findInvoice, saveInvoice, submitInvoice, SELLER } from '../backend/api';
import { aed, lineNet, totals, VAT_LABEL } from '../backend/money';
import { getDB, uid, useDB } from '../backend/store';
import type { Invoice, Issue, Line, VatCategory } from '../backend/types';
import { checkInvoice } from '../backend/validation';
import { Button, Panel, SimTag, navigate } from './common';

const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];

const inputCls = (bad: boolean) =>
  `w-full rounded-lg border bg-surface px-3 py-2 text-[15px] outline-none transition-colors focus:border-route ${
    bad ? 'border-bad bg-bad-soft/40' : 'border-line'
  }`;

function FieldError({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1 text-[14px] leading-snug">
      {issues.map((i) => (
        <p key={i.message}>
          <span className="font-semibold text-bad">{i.message}</span> <span className="text-muted">{i.fix}</span>
        </p>
      ))}
    </div>
  );
}

export default function InvoiceForm({ editId }: { editId?: string }) {
  const db = useDB();
  const existing = editId ? findInvoice(editId) : undefined;
  const [draft, setDraft] = useState<Invoice>(() => (existing ? structuredClone(existing) : blankInvoice()));
  const [checked, setChecked] = useState(existing?.status === 'needs_fixes');
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'found' | 'none'; text?: string }>({ state: 'idle' });
  const topRef = useRef<HTMLDivElement>(null);

  // Once the user has tried to submit, re-run Volopay's checks live as they type,
  // so each error disappears the moment it is fixed.
  const issues = useMemo(() => (checked ? checkInvoice(draft, getDB().invoices) : []), [checked, draft, db]);
  const byField = (f: string) => issues.filter((i) => i.field === f);
  const t = totals(draft);

  if (editId && !existing) {
    return (
      <Panel className="p-8">
        <p className="text-[17px]">This invoice no longer exists. It may have been removed when the demo was reset.</p>
        <Button className="mt-4" onClick={() => navigate('#/')}>Back to invoices</Button>
      </Panel>
    );
  }

  const set = (patch: Partial<Invoice>) => setDraft((d) => ({ ...d, ...patch }));
  const setBuyer = (patch: Partial<Invoice['buyer']>) => setDraft((d) => ({ ...d, buyer: { ...d.buyer, ...patch } }));
  const setLine = (id: string, patch: Partial<Line>) => setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const pickCustomer = (id: string) => {
    const c = db.customers.find((x) => x.id === id);
    setLookup({ state: 'idle' });
    if (!c) return set({ customerId: '' });
    setDraft((d) => ({ ...d, customerId: c.id, buyer: { name: c.name, trn: c.trn, networkId: c.networkId, address: c.address, emirate: c.emirate } }));
  };

  const doLookup = async () => {
    setLookup({ state: 'busy' });
    const hit = await findInDirectory(draft.buyer.trn);
    if (hit) {
      setBuyer({ networkId: hit.networkId });
      setLookup({ state: 'found', text: `Found ${hit.name} at ${hit.networkId}.` });
    } else {
      setLookup({ state: 'none', text: 'No business with this TRN is on the network. Check the TRN first.' });
    }
  };

  const saveDraft = () => {
    const id = saveInvoice(draft);
    navigate(`#/invoice/${id}`);
  };

  const submit = () => {
    setBusy(true);
    const id = saveInvoice(draft);
    void submitInvoice(id);
    // Volopay's checks run synchronously, so the outcome of check 1 is already known here.
    const after = findInvoice(id)!;
    if (after.status === 'needs_fixes') {
      setDraft(structuredClone({ ...after }));
      setChecked(true);
      setBusy(false);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(`#/invoice/${id}`);
  };

  const customer = db.customers.find((c) => c.id === draft.customerId);

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <a href={existing ? `#/invoice/${existing.id}` : '#/'} className="text-[15px] font-semibold text-route hover:underline">
          {existing ? `Back to ${existing.number}` : 'Back to invoices'}
        </a>
        <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.01em]">{existing ? `Edit ${existing.number}` : 'New invoice'}</h1>
        <p className="mt-1 max-w-[70ch] text-[15px] text-muted">
          Volopay checks every mandatory field before anything is sent, so problems are fixed here rather than bounced back by the network.
        </p>
      </div>

      {checked && issues.length > 0 && (
        <Panel className="border-warn/40 bg-warn-soft p-5" >
          <h2 className="text-[17px] font-bold text-warn">
            Volopay stopped this invoice before sending: {issues.length} {issues.length === 1 ? 'problem' : 'problems'} to fix
          </h2>
          <ul className="mt-2 space-y-1.5 text-[15px] leading-snug">
            {issues.map((i) => (
              <li key={i.field + i.message}>
                <span className="font-semibold">{i.message}</span> <span className="text-muted">{i.fix}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {checked && issues.length === 0 && (
        <Panel className="border-good/40 bg-good-soft p-4 text-[15px] font-semibold text-good">All of Volopay’s checks pass. Submit when ready.</Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[19px] font-bold">Invoice</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="text-[14px] font-semibold">Invoice number</span>
              <input className={`tnum mt-1 ${inputCls(byField('number').length > 0)}`} value={draft.number} onChange={(e) => set({ number: e.target.value })} />
              <FieldError issues={byField('number')} />
            </label>
            <label className="block">
              <span className="text-[14px] font-semibold">Issue date</span>
              <input type="date" className={`tnum mt-1 ${inputCls(byField('issueDate').length > 0)}`} value={draft.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-[14px] font-semibold">Due date</span>
              <input type="date" className={`tnum mt-1 ${inputCls(byField('dueDate').length > 0)}`} value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </label>
            <div className="block">
              <span className="text-[14px] font-semibold">Currency</span>
              <p className="mt-1 rounded-lg border border-line-soft bg-paper px-3 py-2 text-[15px]">AED</p>
            </div>
          </div>
          <FieldError issues={[...byField('issueDate'), ...byField('dueDate')]} />
          <div className="mt-5 rounded-lg bg-paper px-4 py-3 text-[14px] leading-relaxed text-muted">
            <span className="font-semibold text-ink">From:</span> {SELLER.name}, TRN <span className="tnum">{SELLER.trn}</span>, network ID{' '}
            <span className="tnum">{SELLER.networkId}</span>, {SELLER.emirate}.
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[19px] font-bold">Customer</h2>
            <SimTag>Customer list from ERP, simulated</SimTag>
          </div>
          <label className="mt-4 block">
            <span className="text-[14px] font-semibold">Choose a customer</span>
            <select className={`mt-1 ${inputCls(false)}`} value={draft.customerId} onChange={(e) => pickCustomer(e.target.value)}>
              <option value="">Select from the ERP</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.erpRef})
                </option>
              ))}
            </select>
          </label>
          {draft.customerId === '' && <FieldError issues={byField('buyer.name')} />}

          {customer && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[14px] font-semibold">Legal name</span>
                <input className={`mt-1 ${inputCls(byField('buyer.name').length > 0)}`} value={draft.buyer.name} onChange={(e) => setBuyer({ name: e.target.value })} />
                <FieldError issues={byField('buyer.name')} />
              </label>
              <label className="block">
                <span className="text-[14px] font-semibold">TRN (15 digits)</span>
                <input
                  inputMode="numeric"
                  className={`tnum mt-1 ${inputCls(byField('buyer.trn').length > 0)}`}
                  value={draft.buyer.trn}
                  placeholder="Missing in the ERP"
                  onChange={(e) => setBuyer({ trn: e.target.value })}
                />
                <FieldError issues={byField('buyer.trn')} />
              </label>
              <label className="block">
                <span className="text-[14px] font-semibold">Network ID</span>
                <input
                  className={`tnum mt-1 ${inputCls(byField('buyer.networkId').length > 0)}`}
                  value={draft.buyer.networkId}
                  onChange={(e) => setBuyer({ networkId: e.target.value })}
                />
                <FieldError issues={byField('buyer.networkId')} />
              </label>
              <div className="sm:col-span-2">
                <Button type="button" variant="quiet" className="!px-2" onClick={doLookup} disabled={lookup.state === 'busy' || !draft.buyer.trn}>
                  {lookup.state === 'busy' ? 'Looking up…' : 'Look up network ID by TRN'}
                </Button>
                <SimTag>Network directory</SimTag>
                {lookup.text && <p className={`mt-1 text-[14px] ${lookup.state === 'found' ? 'text-good' : 'text-bad'}`}>{lookup.text}</p>}
              </div>
              <label className="block">
                <span className="text-[14px] font-semibold">Address</span>
                <input className={`mt-1 ${inputCls(byField('buyer.address').length > 0)}`} value={draft.buyer.address} onChange={(e) => setBuyer({ address: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[14px] font-semibold">Emirate</span>
                <select className={`mt-1 ${inputCls(false)}`} value={draft.buyer.emirate} onChange={(e) => setBuyer({ emirate: e.target.value })}>
                  {EMIRATES.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </label>
              <p className="text-[13px] text-muted sm:col-span-2">Changes to the TRN or network ID are written back to the customer’s ERP record when you save.</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <h2 className="text-[19px] font-bold">Items</h2>
        <FieldError issues={byField('lines')} />
        <div className="mt-4 space-y-4">
          {draft.lines.map((l, idx) => (
            <div key={l.id} className="grid gap-3 border-b border-line-soft pb-4 last:border-b-0 sm:grid-cols-[1fr_90px_140px_170px_120px_auto] sm:items-start">
              <label className="block">
                <span className="text-[13px] font-semibold text-muted">Description</span>
                <input className={`mt-1 ${inputCls(byField(`line.${l.id}.description`).length > 0)}`} value={l.description} placeholder={`Line ${idx + 1}`} onChange={(e) => setLine(l.id, { description: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-muted">Quantity</span>
                <input type="number" min="0" step="1" className={`tnum mt-1 ${inputCls(byField(`line.${l.id}.quantity`).length > 0)}`} value={l.quantity} onChange={(e) => setLine(l.id, { quantity: Number(e.target.value) })} />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-muted">Unit price (AED)</span>
                <input type="number" min="0" step="0.01" className={`tnum mt-1 ${inputCls(byField(`line.${l.id}.unitPrice`).length > 0)}`} value={l.unitPrice} onChange={(e) => setLine(l.id, { unitPrice: Number(e.target.value) })} />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-muted">VAT</span>
                <select className={`mt-1 ${inputCls(false)}`} value={l.vat} onChange={(e) => setLine(l.id, { vat: e.target.value as VatCategory })}>
                  {(Object.keys(VAT_LABEL) as VatCategory[]).map((k) => (
                    <option key={k} value={k}>
                      {VAT_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="text-[13px] font-semibold text-muted">Net (AED)</span>
                <p className="tnum mt-1 py-2 text-[15px] font-semibold">{aed(lineNet(l))}</p>
              </div>
              <div className="sm:pt-6">
                {draft.lines.length > 1 && (
                  <Button type="button" variant="quiet" className="!px-2 !text-muted hover:!text-bad" onClick={() => set({ lines: draft.lines.filter((x) => x.id !== l.id) })}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="sm:col-span-6">
                <FieldError issues={[...byField(`line.${l.id}.description`), ...byField(`line.${l.id}.quantity`), ...byField(`line.${l.id}.unitPrice`)]} />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="quiet" className="mt-2 !px-2" onClick={() => set({ lines: [...draft.lines, { id: uid(), description: '', quantity: 1, unitPrice: 0, vat: 'S' }] })}>
          Add a line
        </Button>

        <dl className="tnum ml-auto mt-4 max-w-xs space-y-1.5 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Net</dt>
            <dd>AED {aed(t.net)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">VAT</dt>
            <dd>AED {aed(t.vat)}</dd>
          </div>
          <div className="flex justify-between text-[18px] font-bold">
            <dt>Total</dt>
            <dd>AED {aed(t.gross)}</dd>
          </div>
        </dl>
      </Panel>

      <div className="flex flex-wrap justify-end gap-3">
        <Button onClick={saveDraft} disabled={busy}>Save draft</Button>
        <Button variant="primary" onClick={submit} disabled={busy}>
          Check and submit
        </Button>
      </div>
    </div>
  );
}
