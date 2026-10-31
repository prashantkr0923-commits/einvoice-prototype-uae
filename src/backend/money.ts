import type { Invoice, Line, VatCategory } from './types';

export const VAT_RATE: Record<VatCategory, number> = { S: 0.05, Z: 0, E: 0 };

export const VAT_LABEL: Record<VatCategory, string> = {
  S: 'Standard 5%',
  Z: 'Zero-rated 0%',
  E: 'Exempt',
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineNet(l: Line): number {
  return round2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));
}

export function lineVat(l: Line): number {
  return round2(lineNet(l) * VAT_RATE[l.vat]);
}

export function totals(inv: Pick<Invoice, 'lines'>) {
  const net = round2(inv.lines.reduce((s, l) => s + lineNet(l), 0));
  const vat = round2(inv.lines.reduce((s, l) => s + lineVat(l), 0));
  return { net, vat, gross: round2(net + vat) };
}

const fmt = new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const aed = (n: number) => fmt.format(n);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function day(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function time(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
