import type { Progress, StepState } from '../backend/types';

function Dot({ state, tone = 'route' }: { state: StepState; tone?: 'route' | 'sand' }) {
  const fill = tone === 'sand' ? 'bg-sand border-sand' : 'bg-route border-route';
  if (state === 'done')
    return (
      <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-white ${fill}`} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7.5l2.6 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  if (state === 'failed')
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bad bg-bad text-white" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
    );
  if (state === 'active') return <span className={`station-active block h-7 w-7 rounded-full border-2 ${fill} opacity-90`} aria-hidden="true" />;
  return <span className="block h-7 w-7 rounded-full border-2 border-line bg-surface" aria-hidden="true" />;
}

const STATE_TEXT: Record<StepState, string> = { idle: 'not reached', active: 'in progress', done: 'done', failed: 'failed' };

function Station({ title, sub, state, tone, simulated }: { title: string; sub: string; state: StepState; tone?: 'route' | 'sand'; simulated: boolean }) {
  return (
    <li className="flex items-start gap-3 md:w-[132px] md:flex-col md:items-center md:gap-2 md:text-center">
      <Dot state={state} tone={tone} />
      <div>
        <p className={`text-[15px] font-semibold leading-tight ${state === 'failed' ? 'text-bad' : ''}`}>{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          {sub}
          {simulated && <span className="block">simulated</span>}
        </p>
        <span className="sr-only">: {STATE_TEXT[state]}</span>
      </div>
    </li>
  );
}

function Link({ on, failed }: { on: boolean; failed?: boolean }) {
  const color = failed ? 'bg-bad/50' : on ? 'bg-route' : 'bg-line';
  return (
    <li aria-hidden="true" className="ml-[13px] h-6 w-0.5 md:ml-0 md:mt-[13px] md:h-0.5 md:w-auto md:flex-1">
      <span className={`block h-full w-full ${color}`} />
    </li>
  );
}

const reached = (s: StepState) => s !== 'idle';

/** The invoice's journey: the five corners of the UAE network, then the money. */
export default function Route({ p }: { p: Progress }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
      <div>
        <h3 className="text-[14px] font-semibold text-muted">E-invoicing network (the five corners)</h3>
        <ol className="mt-4 flex flex-col md:flex-row md:items-start">
          <Station title="Your company" sub="Corner 1, Volopay checks" state={p.volopay} simulated={false} />
          <Link on={reached(p.asp)} failed={p.asp === 'failed'} />
          <Station title="Your ASP" sub="Corner 2, ClearTax" state={p.asp} simulated />
          <Link on={reached(p.buyerAsp)} />
          <Station title="Buyer’s ASP" sub="Corner 3" state={p.buyerAsp} simulated />
          <Link on={reached(p.buyer)} />
          <Station title="Buyer" sub="Corner 4" state={p.buyer} simulated />
        </ol>
        {/* Corner 5 branches off the seller's ASP: the tax copy goes to the FTA in parallel. */}
        <div className="mt-2 flex md:ml-[calc(132px_+_(100%_-_528px)_/_3)] md:w-[132px] md:justify-center">
          <ol className="flex flex-col items-start md:items-center">
            <li aria-hidden="true" className="ml-[13px] h-6 w-0.5 md:ml-0">
              <span className={`block h-full w-full ${reached(p.fta) ? 'bg-sand' : 'bg-line'}`} />
            </li>
            <Station title="FTA" sub="Corner 5, tax data copy" state={p.fta} tone="sand" simulated />
          </ol>
        </div>
      </div>

      <div className="border-line-soft lg:border-l lg:pl-8">
        <h3 className="text-[14px] font-semibold text-muted">Getting paid</h3>
        <ol className="mt-4 flex flex-col md:flex-row md:items-start">
          <Station title="Payment" sub="Received and matched" state={p.payment} simulated={false} />
          <Link on={reached(p.erp)} />
          <Station title="ERP" sub="Marked paid" state={p.erp} simulated />
        </ol>
      </div>
    </div>
  );
}
