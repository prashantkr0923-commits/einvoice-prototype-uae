// Cash application: matching an incoming payment to the invoice it pays.
// The matching logic is real; the incoming payment itself is simulated.
import { totals } from './money';
import type { Invoice } from './types';

export interface IncomingPayment {
  virtualAccount: string;
  amount: number;
  reference: string;
}

export type MatchResult =
  | { matched: true; invoice: Invoice }
  | { matched: false; reason: string };

export function matchPayment(p: IncomingPayment, invoices: Invoice[]): MatchResult {
  // Each invoice has its own virtual account, so the account alone identifies it.
  const byAccount = invoices.find((i) => i.virtualAccount === p.virtualAccount);
  if (!byAccount) return { matched: false, reason: 'No invoice uses this virtual account.' };
  if (byAccount.status !== 'delivered') return { matched: false, reason: `${byAccount.number} is not open for payment.` };
  const due = totals(byAccount).gross;
  if (Math.abs(due - p.amount) > 0.005) {
    return { matched: false, reason: `Amount differs from the invoice total of AED ${due.toFixed(2)}. Sent to a person to review.` };
  }
  return { matched: true, invoice: byAccount };
}
