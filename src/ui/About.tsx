import { Panel } from './common';

const ROWS: { part: string; here: string; real: boolean; production: string }[] = [
  { part: 'Screens: invoice list, invoice form, status route, event history', here: 'Built and working', real: true, production: 'Same, inside Volopay AR' },
  { part: 'Check 1: Volopay’s validation before sending (TRNs, mandatory fields, dates, lines, VAT, totals)', here: 'Built and working', real: true, production: 'Extended to all 51 PINT AE mandatory fields' },
  { part: 'Status rules and the event log', here: 'Built and working', real: true, production: 'Same, driven by partner webhooks' },
  { part: 'Payment matching (cash application)', here: 'Matching logic built; the incoming payment is simulated', real: true, production: 'Fed by the bank partner’s payment notifications' },
  { part: 'Database', here: 'Built, stored in your browser so each reviewer has their own copy', real: true, production: 'Volopay’s own database' },
  { part: 'Check 2 and delivery: the ASP', here: 'Simulated', real: false, production: 'Storecove API: PINT AE validation, Peppol delivery, status callbacks' },
  { part: 'Corners 3 and 4: buyer’s ASP and buyer', here: 'Simulated', real: false, production: 'The live UAE Peppol network' },
  { part: 'Corner 5: tax data copy to the FTA', here: 'Simulated status only', real: false, production: 'Reported by the ASP' },
  { part: 'Network directory lookup', here: 'Simulated with sample entries', real: false, production: 'Peppol directory lookup through the ASP' },
  { part: 'ERP customer list and sync', here: 'Simulated sample records', real: false, production: 'NetSuite, Xero and others through Volopay’s integrations' },
  { part: 'Virtual accounts and incoming money', here: 'Simulated, with deliberately invalid sample numbers', real: false, production: 'A licensed partner such as Airwallex in the UAE' },
];

export default function About() {
  return (
    <div className="space-y-8">
      <div className="max-w-[72ch]">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em]">How this prototype works</h1>
        <p className="mt-3 text-[17px] leading-relaxed">
          From 2027 the UAE requires business invoices to travel as structured data through an Accredited Service Provider (ASP), with a tax copy
          sent to the Federal Tax Authority. This prototype shows how Volopay could make that compliant step also the first step in getting paid.
        </p>
        <p className="mt-3 text-[17px] leading-relaxed">
          Volopay owns the screens, the first round of checks, the status rules and payment matching. Partners carry the invoice across the network,
          report it to the tax authority and hold the money. Validation therefore happens twice: Volopay catches mistakes before sending, and the ASP
          applies the official rules after.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-[15px]">
          <caption className="px-5 pt-5 text-left text-[19px] font-bold sm:px-6">What is built and what is simulated</caption>
          <thead className="text-[13px] text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold sm:px-6">Part</th>
              <th className="px-3 py-3 font-semibold">In this prototype</th>
              <th className="hidden px-5 py-3 font-semibold sm:table-cell sm:px-6">In production</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.part} className="border-b border-line-soft last:border-b-0 align-top">
                <td className="px-5 py-3 sm:px-6">{r.part}</td>
                <td className={`px-3 py-3 font-semibold ${r.real ? 'text-route' : 'text-muted'}`}>{r.here}</td>
                <td className="hidden px-5 py-3 text-muted sm:table-cell sm:px-6">{r.production}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[19px] font-bold">Assumptions</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            <li>The seller and every customer are fictional UAE businesses registered for VAT, invoicing in AED.</li>
            <li>Only standard-rated (5%), zero-rated and exempt supplies are shown.</li>
            <li>Network IDs and the directory use a simplified sample format, not the real Peppol identifier scheme.</li>
            <li>The customer pays the invoice in full, in one transfer, into the invoice’s own account.</li>
          </ul>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[19px] font-bold">Not covered yet</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            <li>Credit notes, self-billing, foreign-currency invoices and the other PINT AE scenarios.</li>
            <li>Generating and signing the full PINT AE file.</li>
            <li>Receiving supplier e-invoices into accounts payable.</li>
            <li>Partial payments, overpayments and the AI collection agents.</li>
            <li>Sign-in, user roles and approval limits.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
