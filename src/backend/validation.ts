// Check 1: Volopay's own validation, run BEFORE anything is sent to the ASP.
// This is real, working logic in the prototype. It covers a subset of the
// UAE PINT AE mandatory fields that matter most for B2B tax invoices.
import { SELLER } from './seed';
import { totals } from './money';
import type { Invoice, Issue } from './types';

export const TRN_PATTERN = /^\d{15}$/;

export function checkInvoice(inv: Invoice, allInvoices: Invoice[], today = new Date()): Issue[] {
  const issues: Issue[] = [];
  const add = (field: string, message: string, fix: string) => issues.push({ field, message, fix });

  if (!TRN_PATTERN.test(SELLER.trn)) {
    add('seller.trn', 'Your company’s TRN is not 15 digits.', 'Update your company profile with the TRN on your VAT certificate.');
  }

  const number = inv.number.trim();
  if (!number) {
    add('number', 'The invoice number is missing.', 'Every e-invoice needs a unique invoice number.');
  } else if (allInvoices.some((o) => o.id !== inv.id && o.number.trim().toUpperCase() === number.toUpperCase())) {
    add('number', `Invoice number ${number} is already used.`, 'Use the next number in your sequence. Duplicate numbers are rejected by the network.');
  }

  const b = inv.buyer;
  if (!b.name.trim()) add('buyer.name', 'The customer’s legal name is missing.', 'Enter the name exactly as it appears on their trade licence.');

  const trn = b.trn.replace(/\s/g, '');
  if (!trn) {
    add('buyer.trn', 'The customer’s TRN is missing.', 'Business customers must have their 15-digit TRN on every e-invoice. Ask the customer for it, then save it so the ERP record is fixed too.');
  } else if (!TRN_PATTERN.test(trn)) {
    add('buyer.trn', `The customer’s TRN has ${trn.replace(/\D/g, '').length} digits; it needs exactly 15.`, 'Check for a missing or extra digit, and remove letters or symbols.');
  }

  if (!b.networkId.trim()) {
    add('buyer.networkId', 'The customer’s network ID is missing.', 'Look the customer up in the network directory to find the address their ASP receives invoices at.');
  }
  if (!b.address.trim()) add('buyer.address', 'The customer’s address is missing.', 'Add the registered address from their trade licence.');

  const issue = new Date(inv.issueDate + 'T00:00:00');
  if (!inv.issueDate || Number.isNaN(issue.getTime())) {
    add('issueDate', 'The issue date is missing.', 'Set the date the invoice is issued.');
  } else {
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    if (issue > endOfToday) add('issueDate', 'The issue date is in the future.', 'Use today’s date or an earlier one.');
  }
  if (inv.dueDate && inv.issueDate && inv.dueDate < inv.issueDate) {
    add('dueDate', 'The due date is before the issue date.', 'Set a due date on or after the issue date.');
  }

  if (inv.lines.length === 0) add('lines', 'The invoice has no line items.', 'Add at least one product or service.');
  inv.lines.forEach((l, i) => {
    const n = i + 1;
    if (!l.description.trim()) add(`line.${l.id}.description`, `Line ${n} has no description.`, 'Describe the goods or service supplied.');
    if (!(Number(l.quantity) > 0)) add(`line.${l.id}.quantity`, `Line ${n} needs a quantity above zero.`, 'Enter how many units were supplied.');
    if (!(Number(l.unitPrice) > 0)) add(`line.${l.id}.unitPrice`, `Line ${n} needs a unit price above zero.`, 'Enter the price per unit in AED, before VAT.');
  });

  if (inv.lines.length > 0 && totals(inv).gross <= 0) {
    add('lines', 'The invoice total is zero.', 'Check quantities and prices.');
  }

  return issues;
}
