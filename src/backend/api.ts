// The prototype's backend facade. The screens call only these functions,
// the same way a production front end would call Volopay's API.
import { lookupDirectory, pause, submitToAsp } from './asp';
import { aed, day, totals } from './money';
import { matchPayment } from './payments';
import { EMPTY_PROGRESS, SELLER, virtualAccountFor } from './seed';
import { commit, getDB, resetDB, uid } from './store';
import type { Actor, Customer, Invoice, InvoiceEvent, Progress, Tone } from './types';
import { checkInvoice } from './validation';

const SIMULATED_ACTORS: Actor[] = ['asp', 'buyer_asp', 'buyer', 'fta', 'bank', 'erp'];

function ev(actor: Actor, title: string, tone: Tone = 'neutral', extra: Partial<InvoiceEvent> = {}): InvoiceEvent {
  return { id: uid(), at: new Date().toISOString(), actor, title, tone, simulated: SIMULATED_ACTORS.includes(actor), ...extra };
}

function updateInvoice(id: string, fn: (inv: Invoice) => Invoice) {
  const db = getDB();
  commit({ ...db, invoices: db.invoices.map((i) => (i.id === id ? fn(i) : i)) });
}

function withEvents(inv: Invoice, ...events: InvoiceEvent[]): Invoice {
  return { ...inv, events: [...inv.events, ...events] };
}

function setProgress(inv: Invoice, p: Partial<Progress>): Invoice {
  return { ...inv, progress: { ...inv.progress, ...p } };
}

export function findInvoice(id: string) {
  return getDB().invoices.find((i) => i.id === id);
}

export function nextNumber(): string {
  return `INV-2026-${String(getDB().nextSeq).padStart(4, '0')}`;
}

export function blankInvoice(customer?: Customer): Invoice {
  const db = getDB();
  const today = new Date();
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const due = new Date(today);
  due.setDate(due.getDate() + 30);
  return {
    id: '',
    number: nextNumber(),
    customerId: customer?.id ?? '',
    buyer: customer
      ? { name: customer.name, trn: customer.trn, networkId: customer.networkId, address: customer.address, emirate: customer.emirate }
      : { name: '', trn: '', networkId: '', address: '', emirate: 'Dubai' },
    issueDate: iso(today),
    dueDate: iso(due),
    lines: [{ id: uid(), description: '', quantity: 1, unitPrice: 0, vat: 'S' }],
    status: 'draft',
    events: [],
    issues: [],
    virtualAccount: virtualAccountFor(db.nextSeq),
    progress: { ...EMPTY_PROGRESS },
    attempts: 0,
  };
}

/** Save a draft (new or edited). Changed customer details are written back to the ERP record. */
export function saveInvoice(draft: Invoice): string {
  const db = getDB();
  const isNew = !draft.id;
  const id = draft.id || `inv-${uid()}`;
  const previous = db.invoices.find((i) => i.id === id);
  const events: InvoiceEvent[] = [];

  if (isNew) events.push(ev('user', 'Draft created'));
  else if (previous && (previous.status === 'rejected' || previous.status === 'needs_fixes')) {
    events.push(ev('user', 'Invoice corrected', 'neutral', { detail: 'Ready to submit again.' }));
  }

  let customers = db.customers;
  const cust = db.customers.find((c) => c.id === draft.customerId);
  if (cust && (cust.trn !== draft.buyer.trn || cust.networkId !== draft.buyer.networkId)) {
    customers = db.customers.map((c) => (c.id === cust.id ? { ...c, trn: draft.buyer.trn, networkId: draft.buyer.networkId } : c));
    events.push(ev('erp', `Customer record ${cust.erpRef} updated in the ERP`, 'neutral', { detail: 'New TRN or network ID written back so the next invoice is right first time.' }));
  }

  const saved: Invoice = {
    ...draft,
    id,
    buyer: { ...draft.buyer, trn: draft.buyer.trn.replace(/\s/g, '') },
    status: 'draft',
    issues: [],
    rejection: undefined,
    progress: { ...EMPTY_PROGRESS },
    events: [...(previous?.events ?? draft.events), ...events],
  };

  const invoices = previous ? db.invoices.map((i) => (i.id === id ? saved : i)) : [saved, ...db.invoices];
  commit({ ...db, customers, invoices, nextSeq: isNew ? db.nextSeq + 1 : db.nextSeq });
  return id;
}

/** Run check 1, then hand the invoice to the (simulated) ASP and follow it across the network. */
export async function submitInvoice(id: string): Promise<'needs_fixes' | 'rejected' | 'delivered'> {
  const inv = findInvoice(id);
  if (!inv) throw new Error('Invoice not found');

  const issues = checkInvoice(inv, getDB().invoices);
  if (issues.length > 0) {
    updateInvoice(id, (i) =>
      withEvents(
        setProgress({ ...i, status: 'needs_fixes', issues }, { volopay: 'failed' }),
        ev('volopay', `Stopped by Volopay checks: ${issues.length} ${issues.length === 1 ? 'problem' : 'problems'} to fix`, 'warn', {
          detail: issues.map((x) => x.message).join(' '),
        }),
      ),
    );
    return 'needs_fixes';
  }

  updateInvoice(id, (i) =>
    withEvents(
      setProgress({ ...i, status: 'sent', issues: [], rejection: undefined, attempts: i.attempts + 1 }, { ...EMPTY_PROGRESS, volopay: 'done', asp: 'active' }),
      ev('volopay', 'Passed Volopay checks', 'good', { detail: 'Mandatory fields, TRNs, VAT categories and totals are complete.' }),
      ev('asp', 'Sent to your ASP', 'neutral', { detail: 'Structured invoice data handed to the network partner.' }),
    ),
  );

  const result = await submitToAsp(findInvoice(id)!);

  if (!result.accepted) {
    const r = result.rejection;
    updateInvoice(id, (i) =>
      withEvents(
        setProgress({ ...i, status: 'rejected', rejection: r }, { asp: 'failed' }),
        ev('asp', 'Rejected by your ASP', 'bad', { code: r.code, detail: r.message }),
      ),
    );
    return 'rejected';
  }

  updateInvoice(id, (i) =>
    withEvents(setProgress(i, { asp: 'done', buyerAsp: 'active', fta: 'active' }), ev('asp', 'Validated by your ASP against PINT AE rules', 'good')),
  );
  await pause(800);
  updateInvoice(id, (i) =>
    withEvents(
      setProgress(i, { buyerAsp: 'done', buyer: 'done', fta: 'done' }),
      ev('buyer_asp', "Delivered to the buyer's ASP", 'good'),
      ev('buyer', `Available to ${i.buyer.name}`, 'good'),
      ev('fta', 'Tax data copy reported to the FTA', 'good', { code: 'TDD status S (submit)' }),
    ),
  );
  await pause(500);
  updateInvoice(id, (i) =>
    withEvents(
      { ...i, status: 'delivered', progress: { ...i.progress, payment: 'active' } },
      ev('volopay', 'Waiting for payment', 'neutral', { detail: `AED ${aed(totals(i).gross)} due by ${day(i.dueDate)}. Pays into virtual account ${i.virtualAccount}.` }),
    ),
  );
  return 'delivered';
}

export async function findInDirectory(trn: string) {
  return lookupDirectory(trn);
}

/** Use the network ID found in the directory, and write it back to the ERP customer record. */
export function applyNetworkId(id: string, networkId: string) {
  const inv = findInvoice(id);
  if (!inv) return;
  saveInvoice({ ...inv, buyer: { ...inv.buyer, networkId } });
}

/** Simulate the customer paying in full, then run real matching and post to the ERP. */
export async function simulatePayment(id: string) {
  const inv = findInvoice(id);
  if (!inv || inv.status !== 'delivered') return;
  const amount = totals(inv).gross;

  updateInvoice(id, (i) =>
    withEvents(i, ev('bank', `AED ${aed(amount)} received in the invoice’s virtual account`, 'neutral', { detail: `From ${i.buyer.name}, reference ${i.number}.` })),
  );
  await pause(700);

  const result = matchPayment({ virtualAccount: inv.virtualAccount, amount, reference: inv.number }, getDB().invoices);
  if (!result.matched) {
    updateInvoice(id, (i) => withEvents(i, ev('volopay', 'Payment needs review', 'warn', { detail: result.reason })));
    return;
  }
  updateInvoice(id, (i) =>
    withEvents(
      setProgress({ ...i, status: 'paid' }, { payment: 'done', erp: 'active' }),
      ev('volopay', `Payment matched to ${i.number} by virtual account and reference`, 'good'),
    ),
  );
  await pause(600);
  updateInvoice(id, (i) => withEvents(setProgress(i, { erp: 'done' }), ev('erp', 'Marked paid in the ERP', 'good')));
}

export function resetDemo() {
  resetDB();
}

export { SELLER };
