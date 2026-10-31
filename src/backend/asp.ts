// SIMULATED: the Accredited Service Provider (ASP) integration.
// In production this module is Volopay's "network adapter": it would call the
// partner ASP's API (ClearTax in the strategy, an accredited UAE ASP), which validates the invoice
// against PINT AE rules (check 2), delivers it to the buyer's ASP over Peppol,
// reports the tax data document to the FTA, and returns statuses by webhook.
// Here every response is generated locally from sample data.
import { DIRECTORY } from './seed';
import type { Invoice, Rejection } from './types';

export const SIMULATED_ASP_NAME = 'ClearTax (simulated)';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AspResult = { accepted: true } | { accepted: false; rejection: Rejection };

/** Check 2 (simulated): structural rules plus a lookup of the buyer on the network. */
export async function submitToAsp(inv: Invoice): Promise<AspResult> {
  await wait(900);
  const entry = DIRECTORY[inv.buyer.trn.replace(/\s/g, '')];
  if (!entry) {
    return {
      accepted: false,
      rejection: {
        code: 'RECEIVER_NOT_REGISTERED',
        field: 'buyer.trn',
        message: `No business with TRN ${inv.buyer.trn} is registered on the e-invoicing network.`,
        fix: 'Confirm the TRN with the customer. If it is right, they have not appointed an ASP yet and cannot receive e-invoices.',
      },
    };
  }
  if (entry.networkId !== inv.buyer.networkId.trim()) {
    return {
      accepted: false,
      rejection: {
        code: 'RECEIVER_NOT_FOUND',
        field: 'buyer.networkId',
        message: `Nothing on the e-invoicing network answers at ${inv.buyer.networkId || 'an empty network ID'}.`,
        fix: 'The customer’s network ID in your records is out of date. Look them up in the network directory, update the ID and resubmit.',
      },
    };
  }
  return { accepted: true };
}

/** Simulated network directory lookup by TRN. */
export async function lookupDirectory(trn: string) {
  await wait(500);
  return DIRECTORY[trn.replace(/\s/g, '')] ?? null;
}

export const pause = wait;
