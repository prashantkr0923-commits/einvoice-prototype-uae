import type { Customer, DB, Invoice, Party, Progress } from './types';

// All companies, tax numbers, network IDs and account numbers below are
// fictional sample data created for this prototype.

export const SELLER: Party = {
  name: 'Falconridge Trading LLC',
  trn: '100123456700003',
  networkId: 'AE-1001234567',
  address: 'Sample address 12, Business Bay',
  emirate: 'Dubai',
};

/** Customer records as they come from the simulated ERP. Two are deliberately imperfect. */
export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'c-marinavale',
    erpRef: 'CUST-1042',
    name: 'Marinavale Contracting LLC',
    trn: '100345678900003',
    networkId: 'AE-1003456789',
    address: 'Sample address 4, Al Reem Island',
    emirate: 'Abu Dhabi',
  },
  {
    id: 'c-gulfbreeze',
    erpRef: 'CUST-1017',
    name: 'Gulfbreeze Fresh Distribution LLC',
    trn: '100234567800003',
    // Outdated in the ERP: two digits are swapped. The network directory holds AE-1002345678.
    networkId: 'AE-1002345687',
    address: 'Sample address 31, Industrial Area 6',
    emirate: 'Sharjah',
  },
  {
    id: 'c-dunepath',
    erpRef: 'CUST-1088',
    name: 'Dunepath Logistics FZE',
    // Missing in the ERP. The sample TRN to type in is 100456789000003.
    trn: '',
    networkId: 'AE-1004567890',
    address: 'Sample address 8, Jebel Ali Free Zone',
    emirate: 'Dubai',
  },
  {
    id: 'c-oasiscroft',
    erpRef: 'CUST-1103',
    name: 'Oasiscroft Home Retail LLC',
    trn: '100567890100003',
    networkId: 'AE-1005678901',
    address: 'Sample address 19, Al Jurf',
    emirate: 'Ajman',
  },
];

/** The simulated network directory (who is reachable on the e-invoicing network), keyed by TRN. */
export const DIRECTORY: Record<string, { name: string; networkId: string }> = {
  '100345678900003': { name: 'Marinavale Contracting LLC', networkId: 'AE-1003456789' },
  '100234567800003': { name: 'Gulfbreeze Fresh Distribution LLC', networkId: 'AE-1002345678' },
  '100456789000003': { name: 'Dunepath Logistics FZE', networkId: 'AE-1004567890' },
  '100567890100003': { name: 'Oasiscroft Home Retail LLC', networkId: 'AE-1005678901' },
};

export const SAMPLE_TRN_FOR_DUNEPATH = '100456789000003';

export function virtualAccountFor(seq: number): string {
  // "AE00" check digits make this an invalid IBAN on purpose: it can never be a real account.
  const s = String(seq).padStart(3, '0');
  return `AE00 0860 0001 4400 0000 ${s}`;
}

const idle: Progress = { volopay: 'idle', asp: 'idle', buyerAsp: 'idle', buyer: 'idle', fta: 'idle', payment: 'idle', erp: 'idle' };
const delivered: Progress = { volopay: 'done', asp: 'done', buyerAsp: 'done', buyer: 'done', fta: 'done', payment: 'idle', erp: 'idle' };
const paid: Progress = { ...delivered, payment: 'done', erp: 'done' };

const buyerOf = (c: Customer): Party => ({ name: c.name, trn: c.trn, networkId: c.networkId, address: c.address, emirate: c.emirate });

function seedInvoices(): Invoice[] {
  const [marina, gulf, , oasis] = SEED_CUSTOMERS;
  return [
    {
      id: 'inv-0141',
      number: 'INV-2026-0141',
      customerId: marina.id,
      buyer: buyerOf(marina),
      issueDate: '2026-10-12',
      dueDate: '2026-11-11',
      lines: [
        { id: 'l1', description: 'Site supervision, October', quantity: 1, unitPrice: 18500, vat: 'S' },
        { id: 'l2', description: 'Safety equipment rental', quantity: 4, unitPrice: 1250, vat: 'S' },
      ],
      status: 'paid',
      issues: [],
      virtualAccount: virtualAccountFor(141),
      progress: paid,
      attempts: 1,
      events: [
        { id: 'e1', at: '2026-10-12T09:14:02+04:00', actor: 'volopay', title: 'Passed Volopay checks', simulated: false, tone: 'good' },
        { id: 'e2', at: '2026-10-12T09:14:03+04:00', actor: 'asp', title: 'Validated by your ASP against PINT AE rules', simulated: true, tone: 'good' },
        { id: 'e3', at: '2026-10-12T09:14:05+04:00', actor: 'buyer_asp', title: "Delivered to the buyer's ASP", simulated: true, tone: 'good' },
        { id: 'e4', at: '2026-10-12T09:14:05+04:00', actor: 'fta', title: 'Tax data copy reported to the FTA', code: 'TDD status S (submit)', simulated: true, tone: 'good' },
        { id: 'e5', at: '2026-10-29T11:02:41+04:00', actor: 'bank', title: 'AED 24,675.00 received in the invoice’s virtual account', simulated: true, tone: 'neutral' },
        { id: 'e6', at: '2026-10-29T11:02:42+04:00', actor: 'volopay', title: 'Payment matched to INV-2026-0141 by virtual account and reference', simulated: false, tone: 'good' },
        { id: 'e7', at: '2026-10-29T11:02:43+04:00', actor: 'erp', title: 'Marked paid in the ERP', simulated: true, tone: 'good' },
      ],
    },
    {
      id: 'inv-0142',
      number: 'INV-2026-0142',
      customerId: oasis.id,
      buyer: buyerOf(oasis),
      issueDate: '2026-10-20',
      dueDate: '2026-11-19',
      lines: [{ id: 'l1', description: 'Display fixtures, batch B', quantity: 12, unitPrice: 2400, vat: 'S' }],
      status: 'delivered',
      issues: [],
      virtualAccount: virtualAccountFor(142),
      progress: delivered,
      attempts: 1,
      events: [
        { id: 'e1', at: '2026-10-20T15:40:10+04:00', actor: 'volopay', title: 'Passed Volopay checks', simulated: false, tone: 'good' },
        { id: 'e2', at: '2026-10-20T15:40:11+04:00', actor: 'asp', title: 'Validated by your ASP against PINT AE rules', simulated: true, tone: 'good' },
        { id: 'e3', at: '2026-10-20T15:40:13+04:00', actor: 'buyer_asp', title: "Delivered to the buyer's ASP", simulated: true, tone: 'good' },
        { id: 'e4', at: '2026-10-20T15:40:13+04:00', actor: 'fta', title: 'Tax data copy reported to the FTA', code: 'TDD status S (submit)', simulated: true, tone: 'good' },
      ],
    },
    {
      id: 'inv-0143',
      number: 'INV-2026-0143',
      customerId: gulf.id,
      buyer: buyerOf(gulf),
      issueDate: '2026-10-30',
      dueDate: '2026-11-29',
      lines: [
        { id: 'l1', description: 'Cold-chain packaging, pallet lot', quantity: 40, unitPrice: 185, vat: 'S' },
        { id: 'l2', description: 'Delivery to Sharjah warehouse', quantity: 1, unitPrice: 900, vat: 'S' },
      ],
      status: 'draft',
      issues: [],
      virtualAccount: virtualAccountFor(143),
      progress: idle,
      attempts: 0,
      events: [
        { id: 'e1', at: '2026-10-30T17:05:00+04:00', actor: 'erp', title: 'Draft created from ERP sales order SO-5521', simulated: true, tone: 'neutral' },
      ],
    },
  ];
}

export const DB_VERSION = 3;

export function seedDB(): DB {
  return {
    version: DB_VERSION,
    customers: SEED_CUSTOMERS.map((c) => ({ ...c })),
    invoices: seedInvoices(),
    nextSeq: 144,
  };
}

export const EMPTY_PROGRESS = idle;
