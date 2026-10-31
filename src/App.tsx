import { useEffect, useState } from 'react';
import { resetDemo } from './backend/api';
import { useDB } from './backend/store';
import About from './ui/About';
import InvoiceDetail from './ui/InvoiceDetail';
import InvoiceForm from './ui/InvoiceForm';
import InvoiceList from './ui/InvoiceList';
import { navigate } from './ui/common';

const LINKEDIN = 'https://www.linkedin.com/in/prashant-kumar-0b069180/';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const db = useDB();
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  let page: JSX.Element;
  let section: 'invoices' | 'new' | 'about' = 'invoices';
  if (parts[0] === 'new') {
    section = 'new';
    page = <InvoiceForm key="new" />;
  } else if (parts[0] === 'invoice' && parts[1] && parts[2] === 'edit') {
    page = <InvoiceForm key={`edit-${parts[1]}`} editId={parts[1]} />;
  } else if (parts[0] === 'invoice' && parts[1]) {
    page = <InvoiceDetail key={parts[1]} id={parts[1]} />;
  } else if (parts[0] === 'about') {
    section = 'about';
    page = <About />;
  } else {
    page = <InvoiceList invoices={db.invoices} />;
  }

  const navCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-[15px] font-semibold ${active ? 'bg-route-soft text-route' : 'text-muted hover:text-ink'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-sand/30 bg-sand-soft px-4 py-2 text-center text-[14px] text-[#5c4417]">
        Prototype. Every ASP, tax authority, ERP and bank response here is simulated with sample data.
      </div>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <a href="#/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="Invoice-to-Cash home">
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#0E6F6E" />
              <path d="M8 21h16M8 16h10M8 11h13" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold">Invoice-to-Cash</span>
              <span className="block text-[13px] text-muted">UAE e-invoicing prototype</span>
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
            <a href="#/" className={navCls(section === 'invoices')}>Invoices</a>
            <a href="#/new" className={navCls(section === 'new')}>New invoice</a>
            <a href="#/about" className={navCls(section === 'about')}>How this prototype works</a>
          </nav>
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-lg px-3 py-1.5 text-[14px] font-medium text-muted hover:bg-line-soft hover:text-ink"
            onClick={() => {
              if (window.confirm('Reset the demo? All invoices go back to the original sample data.')) {
                resetDemo();
                navigate('#/');
              }
            }}
          >
            Reset demo
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6">{page}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-5 text-[14px] leading-relaxed text-muted sm:px-6">
          Prototype by{' '}
          <a className="font-semibold text-route underline-offset-2 hover:underline" href={LINKEDIN} target="_blank" rel="noreferrer">
            Prashant Kumar
          </a>{' '}
          for the Volopay Founder's Office assignment. Not a Volopay product. All partner, tax authority, ERP and bank responses are
          simulated, and all companies, tax numbers and accounts are fictional sample data.
        </div>
      </footer>
    </div>
  );
}
