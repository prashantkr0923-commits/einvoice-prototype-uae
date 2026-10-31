# Invoice-to-Cash: UAE e-invoicing prototype

A working prototype of compliant UAE e-invoicing built into accounts receivable: create an invoice, let Volopay check it, send it through a (simulated) Accredited Service Provider, fix a rejection, then get paid and reconciled.

**Live prototype:** https://prashantkr0923-commits.github.io/einvoice-prototype-uae/

Built by [Prashant Kumar](https://www.linkedin.com/in/prashant-kumar-0b069180/) for the Volopay Founder's Office assignment. Not a Volopay product. All partner, tax authority, ERP and bank responses are simulated, and all companies, tax numbers and accounts are fictional sample data.

## What to try

1. Open `INV-2026-0143` and submit it. The ASP rejects it because the customer's network ID in the ERP is out of date. Look it up in the network directory, apply the fix and resubmit.
2. Simulate the customer's payment and watch it get matched to the invoice and posted to the ERP.
3. Create a new invoice for Dunepath Logistics. Volopay's own checks stop it because the TRN is missing. Enter `100456789000003` and submit again.

"Reset demo" in the header restores the sample data.

## What is built and what is simulated

| Part | In this prototype |
| --- | --- |
| Screens, status route, event history | Built |
| Check 1: Volopay's validation before sending (`src/backend/validation.ts`) | Built |
| Status rules and event log (`src/backend/api.ts`) | Built |
| Payment matching (`src/backend/payments.ts`) | Built; the incoming payment is simulated |
| Database (`src/backend/store.ts`) | Built, stored in the browser |
| ASP: check 2, delivery, tax copy to the FTA (`src/backend/asp.ts`) | Simulated |
| ERP customer records, network directory, bank account | Simulated sample data |

## Run it locally (Mac)

```bash
npm install
npm run dev
```

Then open the address Vite prints, usually http://localhost:5173.

## Stack

Vite, React, TypeScript and Tailwind CSS. The built site is published from the `gh-pages` branch.
