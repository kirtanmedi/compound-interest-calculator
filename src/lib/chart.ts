import type { Snapshot } from './engine';

/** "Nice" tick values covering [min, max], d3-style (steps of 1, 2, 2.5 or 5 × 10^n). */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(step)));
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step - 1e-9);
  const ticks: number[] = [];
  for (let i = first; i <= last; i++) ticks.push(Number((i * step).toFixed(decimals)));
  return ticks;
}

/** Year-end snapshots for long horizons; every period for short ones so the curve isn't 3 points. */
export function samplePoints(points: Snapshot[], years: number): Snapshot[] {
  if (years <= 5) return points;
  return points.filter((p) => Number.isInteger(p.t));
}

/** Index of the snapshot with `t` closest to the given time (points are sorted by t). */
export function nearestIndex(points: Snapshot[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return Math.abs(points[hi].t - t) < Math.abs(points[lo].t - t) ? hi : lo;
}
