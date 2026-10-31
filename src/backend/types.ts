// Shared data shapes. In production these would live in Volopay's backend
// and database; in this prototype they are stored in the browser.

/** UAE VAT categories used in this prototype: standard 5%, zero-rated, exempt. */
export type VatCategory = 'S' | 'Z' | 'E';

export interface Line {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: VatCategory;
}

/** A business on an invoice: seller or buyer. */
export interface Party {
  name: string;
  /** Tax Registration Number: 15 digits in the UAE. */
  trn: string;
  /** The address the e-invoicing network delivers to (sample format). */
  networkId: string;
  address: string;
  emirate: string;
}

/** A customer record as it arrives from the (simulated) ERP. */
export interface Customer extends Party {
  id: string;
  erpRef: string;
}

export type Status = 'draft' | 'needs_fixes' | 'sent' | 'rejected' | 'delivered' | 'paid';

/** Who produced an event. Everything except 'volopay' and 'user' is simulated. */
export type Actor = 'user' | 'volopay' | 'asp' | 'buyer_asp' | 'buyer' | 'fta' | 'bank' | 'erp';

export type Tone = 'neutral' | 'good' | 'bad' | 'warn';

export interface InvoiceEvent {
  id: string;
  at: string; // ISO timestamp
  actor: Actor;
  title: string;
  detail?: string;
  code?: string;
  simulated: boolean;
  tone: Tone;
}

/** A problem found by Volopay's own checks before sending (check 1). */
export interface Issue {
  field: string;
  message: string;
  fix: string;
}

/** A rejection returned by the ASP after sending (check 2, simulated). */
export interface Rejection {
  code: string;
  message: string;
  fix: string;
  field: string;
}

export type StepState = 'idle' | 'active' | 'done' | 'failed';

/** Progress along the e-invoicing network and the payment path. */
export interface Progress {
  volopay: StepState; // corner 1: your company, Volopay checks
  asp: StepState; // corner 2: your ASP
  buyerAsp: StepState; // corner 3
  buyer: StepState; // corner 4
  fta: StepState; // corner 5: tax data copy
  payment: StepState; // money received and matched
  erp: StepState; // posted to ERP
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  buyer: Party;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  lines: Line[];
  status: Status;
  events: InvoiceEvent[];
  issues: Issue[];
  rejection?: Rejection;
  virtualAccount: string;
  progress: Progress;
  attempts: number;
}

export interface DB {
  version: number;
  customers: Customer[];
  invoices: Invoice[];
  nextSeq: number;
}
