const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** $1,234,567 */
export const money = (v: number) => usd0.format(v);

/** $1,234.56 where cents matter (small amounts); whole dollars stay "$500". */
export const moneyCents = (v: number) =>
  Math.abs(v) < 1000 && !Number.isInteger(v) ? usd2.format(v) : usd0.format(v);

/** $1.2M, $640K, $950 */
export const moneyCompact = (v: number) => (Math.abs(v) < 1000 ? usd0.format(v) : usdCompact.format(v));

/** 1,234.5 (for input fields) */
export const plainNumber = (v: number) => plain.format(v);

export const percent = (v: number, digits = 2) =>
  `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;

/** 2.25 → "2 yrs 3 mo" */
export function duration(years: number): string {
  let whole = Math.floor(years);
  let months = Math.round((years - whole) * 12);
  if (months === 12) {
    whole += 1;
    months = 0;
  }
  const parts: string[] = [];
  if (whole > 0) parts.push(`${whole} yr${whole === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.length ? parts.join(' ') : '0 mo';
}

/** Parses user-typed numbers like "$1,000", "1.5k", "2m". Returns null if unparseable. */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/[$,%\s_]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const m = cleaned.match(/^(-?\d*\.?\d*)([kmb])?$/);
  if (!m || m[1] === '' || m[1] === '-') return null;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1;
  return base * mult;
}
