import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Status } from '../backend/types';

export function navigate(hash: string) {
  window.location.hash = hash;
  window.scrollTo({ top: 0 });
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-line-soft text-muted' },
  needs_fixes: { label: 'Needs fixes', cls: 'bg-warn-soft text-warn' },
  sent: { label: 'Sending', cls: 'bg-route-soft text-route' },
  rejected: { label: 'Rejected by ASP', cls: 'bg-bad-soft text-bad' },
  delivered: { label: 'Awaiting payment', cls: 'bg-route-soft text-route' },
  paid: { label: 'Paid', cls: 'bg-good-soft text-good' },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export function SimTag({ children = 'Simulated' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-dashed border-muted/60 px-1.5 text-[12px] font-medium leading-5 text-muted whitespace-nowrap">
      {children}
    </span>
  );
}

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
  const look: Record<Variant, string> = {
    primary: 'bg-route text-white hover:bg-[#0b5b5a]',
    secondary: 'border border-line bg-surface text-ink hover:border-muted/50',
    quiet: 'text-route hover:bg-route-soft',
    danger: 'border border-bad/40 bg-surface text-bad hover:bg-bad-soft',
  };
  return <button className={`${base} ${look[variant]} ${className}`} {...rest} />;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}
